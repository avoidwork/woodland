#!/usr/bin/env bash

sudo dtrace -Z -n 'woodland*:::allows{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'woodland*:::decorate{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'woodland*:::error{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'woodland*:::route{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'woodland*:::routes{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); }'
