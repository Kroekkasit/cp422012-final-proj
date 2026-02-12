#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

#include <mysql/mysql.h>

/*
 * Simple daemon to read /proc/net/arp periodically and upsert
 * MAC/IP information into the MySQL devices table.
 *
 * This keeps a near-real-time mapping of connected clients that
 * the Node.js captive portal can then use (via client IP) to
 * resolve MAC + registration state.
 *
 * Configuration is via environment variables:
 *   DB_HOST (default: 127.0.0.1)
 *   DB_PORT (default: 3306)
 *   DB_USER (default: root)
 *   DB_PASS (default: empty)
 *   DB_NAME (default: classroom_attendance)
 *   SCAN_INTERVAL_SEC (default: 5)
 */

static const char *get_env_or_default(const char *name, const char *defval) {
    const char *v = getenv(name);
    return (v && v[0]) ? v : defval;
}

static unsigned int get_env_uint_or_default(const char *name, unsigned int defval) {
    const char *v = getenv(name);
    if (!v || !*v) return defval;
    char *end = NULL;
    unsigned long tmp = strtoul(v, &end, 10);
    if (end == v || tmp == 0 || tmp > 3600) {
        return defval;
    }
    return (unsigned int)tmp;
}

static void trim_newline(char *s) {
    if (!s) return;
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r')) {
        s[len - 1] = '\0';
        len--;
    }
}

static int connect_db(MYSQL *conn) {
    const char *host = get_env_or_default("DB_HOST", "127.0.0.1");
    const char *user = get_env_or_default("DB_USER", "admin");
    const char *pass = get_env_or_default("DB_PASS", "strongpassword");
    const char *db   = get_env_or_default("DB_NAME", "classroom_attendance");
    unsigned int port = (unsigned int)strtoul(
        get_env_or_default("DB_PORT", "3306"), NULL, 10);

    if (!mysql_init(conn)) {
        fprintf(stderr, "[arp_scanner] mysql_init failed\n");
        return -1;
    }

    if (!mysql_real_connect(conn, host, user, pass, db, port, NULL, 0)) {
        fprintf(stderr, "[arp_scanner] mysql_real_connect failed: %s\n",
                mysql_error(conn));
        return -1;
    }

    return 0;
}

static int upsert_device(MYSQL *conn, const char *ip, const char *mac) {
    /*
     * Normalize MAC to lowercase; MySQL side enforces unique( mac_address ).
     * We only touch MAC/IP/last_seen on scan; registration flags and
     * student binding are controlled by the web layer.
     */
    char mac_norm[18];
    memset(mac_norm, 0, sizeof(mac_norm));
    size_t i;
    for (i = 0; i < 17 && mac[i]; i++) {
        char c = mac[i];
        if (c >= 'A' && c <= 'F') c = (char)(c - 'A' + 'a');
        mac_norm[i] = c;
    }

    char query[512];
    int n = snprintf(
        query, sizeof(query),
        "INSERT INTO devices (mac_address, last_ip, last_seen, registered) "
        "VALUES ('%s', '%s', NOW(), 0) "
        "ON DUPLICATE KEY UPDATE "
        "last_ip = VALUES(last_ip), "
        "last_seen = VALUES(last_seen)",
        mac_norm, ip
    );
    if (n <= 0 || (size_t)n >= sizeof(query)) {
        fprintf(stderr, "[arp_scanner] query too long, skipping\n");
        return -1;
    }

    if (mysql_query(conn, query) != 0) {
        fprintf(stderr, "[arp_scanner] mysql_query failed: %s\n", mysql_error(conn));
        return -1;
    }

    return 0;
}

static void scan_arp_table(MYSQL *conn) {
    FILE *fp = fopen("/proc/net/arp", "r");
    if (!fp) {
        perror("[arp_scanner] fopen(/proc/net/arp)");
        return;
    }

    char line[512];
    /* Skip header line. */
    if (!fgets(line, sizeof(line), fp)) {
        fclose(fp);
        return;
    }

    while (fgets(line, sizeof(line), fp)) {
        trim_newline(line);
        if (!line[0]) continue;

        /*
         * Format:
         * IP address       HW type     Flags       HW address            Mask     Device
         * 192.168.0.10     0x1         0x2         12:34:56:78:9a:bc     *        wlan0
         */
        char ip[64] = {0};
        char hw_type[32] = {0};
        char flags[32] = {0};
        char mac[32] = {0};
        char mask[32] = {0};
        char dev[32] = {0};

        int fields = sscanf(
            line, "%63s %31s %31s %31s %31s %31s",
            ip, hw_type, flags, mac, mask, dev
        );
        if (fields != 6) {
            continue;
        }

        /* Skip incomplete entries or the AP itself (usually with MAC "00:00:00:00:00:00") */
        if (strcmp(mac, "00:00:00:00:00:00") == 0) {
            continue;
        }

        if (upsert_device(conn, ip, mac) != 0) {
            /* Log and continue; best-effort. */
            continue;
        }
    }

    fclose(fp);
}

int main(void) {
    unsigned int interval = get_env_uint_or_default("SCAN_INTERVAL_SEC", 5);

    MYSQL conn;
    memset(&conn, 0, sizeof(conn));

    if (connect_db(&conn) != 0) {
        fprintf(stderr, "[arp_scanner] failed to connect to DB, exiting\n");
        return 1;
    }

    fprintf(stderr, "[arp_scanner] started, scan interval = %u seconds\n", interval);

    while (1) {
        scan_arp_table(&conn);
        sleep(interval);
    }

    mysql_close(&conn);
    return 0;
}

