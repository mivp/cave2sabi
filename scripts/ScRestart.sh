#!/bin/bash
nohup ssh administrator@audio1.cave.monash.edu  'pkill -f ocachesrv' > /dev/null &
nohup ssh administrator@audio1.cave.monash.edu  'nohup /Users/administrator/Desktop/sabi.js/scripts/ScOff & ' > /dev/null &
sleep 5
nohup ssh administrator@audio1.cave.monash.edu  'nohup /Users/administrator/Desktop/sabi.js/scripts/ScOn &' > /dev/null &



