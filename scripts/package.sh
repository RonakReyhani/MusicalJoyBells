#!/bin/bash

cd .build

for fn in $(ls .); do
    (cd $fn && zip -rm9 ../$fn.zip .)
    rm -rf $fn
done

cd -
