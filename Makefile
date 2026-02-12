CC      := gcc
CFLAGS  := -Wall -Wextra -O2
LDFLAGS :=

MYSQL_CFLAGS  ?= $(shell mysql_config --cflags 2>/dev/null || echo "")
MYSQL_LDFLAGS ?= $(shell mysql_config --libs 2>/dev/null || echo "-lmysqlclient")

BIN_ARP_SCANNER := arp_scanner

.PHONY: all clean

all: $(BIN_ARP_SCANNER)

$(BIN_ARP_SCANNER): arp_scanner.c
	$(CC) $(CFLAGS) $(MYSQL_CFLAGS) -o $@ $< $(MYSQL_LDFLAGS) $(LDFLAGS)

clean:
	rm -f $(BIN_ARP_SCANNER)

