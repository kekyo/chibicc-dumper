CFLAGS=-std=c11 -O2 -g -Wall -Wno-switch
TEST_RESULTS_STAMP:=$(shell date +%Y%m%d_%H%M%S_%3N)
TEST_RESULTS_DIR:=$(CURDIR)/test_results/$(TEST_RESULTS_STAMP)
BINARY=chibicc-dumper

SRCS=$(wildcard *.c)
OBJS=$(SRCS:.c=.o)

$(BINARY): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(OBJS): chibicc.h

test: $(BINARY)
	mkdir -p "$(TEST_RESULTS_DIR)"
	echo "writing JSON test results to $(TEST_RESULTS_DIR)"
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" bash test/driver.sh ./$(BINARY)
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" bash test/json-dump.sh ./$(BINARY)
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" node test/check-fixtures.mjs ./$(BINARY)
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" node test/self-parse.mjs ./$(BINARY)
	TEST_RESULTS_DIR="$(TEST_RESULTS_DIR)" bash test/build-pack.sh

test-all: test

clean:
	rm -rf $(BINARY) artifacts chibicc stage2 test/*.exe test/*.o test/*.s
	find * -type f '(' -name '*~' -o -name '*.o' ')' -exec rm {} ';'

.PHONY: test test-all clean
