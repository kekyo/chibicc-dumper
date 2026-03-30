CFLAGS=-std=c11 -g -Wall -Wno-switch

SRCS=$(wildcard *.c)
OBJS=$(SRCS:.c=.o)

chibicc: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(OBJS): chibicc.h

test: chibicc
	bash test/driver.sh ./chibicc
	bash test/json-dump.sh ./chibicc
	node test/check-fixtures.mjs ./chibicc
	node test/self-parse.mjs ./chibicc

test-all: test

clean:
	rm -rf chibicc stage2 test/*.exe test/*.o test/*.s
	find * -type f '(' -name '*~' -o -name '*.o' ')' -exec rm {} ';'

.PHONY: test test-all clean
