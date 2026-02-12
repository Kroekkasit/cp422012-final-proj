#include <stdio.h>
#include <stdlib.h>

int run(const char *cmd)
{
    int r = system(cmd);
    if (r != 0)
        fprintf(stderr, "Failed: %s\n", cmd);
    return r;
}

int main()
{
    printf("[+] Starting Wi-Fi Access Point on Arch Linux\n");

    run("ip link set wlan0 down");
    run("ip addr flush dev wlan0");
    run("ip addr add 192.168.100.1/24 dev wlan0");
    run("ip link set wlan0 up");

    run("sysctl -w net.ipv4.ip_forward=1");

    run("pkill dnsmasq"); // avoid conflicts
    run("dnsmasq --interface=wlan0 --bind-interfaces "
        "--dhcp-range=192.168.100.10,192.168.100.50,12h");

    run("hostapd /etc/hostapd/hostapd.conf -B");

    printf("[+] AP is live!\n");
    printf("    SSID: ArchLaptopAP\n");
    printf("    IP:   192.168.100.1\n");

    return 0;
}

