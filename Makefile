CFLAGS=-std=c11 -g -Wall -Wno-switch
TEST_RESULTS_STAMP:=$(shell date +%Y%m%d_%H%M%S_%3N)
TEST_RESULTS_DIR:=$(CURDIR)/test_results/$(TEST_RESULTS_STAMP)

SRCS=$(wildcard *.c)
OBJS=$(SRCS:.c=.o)

chibicc: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(OBJS): chibicc.h

test: chibicc
	mkdir -p "$(TEST_RESULTS_DIR)"
	echo "writing JSON test results to $(TEST_RESULTS_DIR)"
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" bash test/driver.sh ./chibicc
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" bash test/json-dump.sh ./chibicc
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" node test/check-fixtures.mjs ./chibicc
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" node test/self-parse.mjs ./chibicc

test-all: test

clean:
	rm -rf chibicc stage2 test/*.exe test/*.o test/*.s
	find * -type f '(' -name '*~' -o -name '*.o' ')' -exec rm {} ';'

.PHONY: test test-all clean
