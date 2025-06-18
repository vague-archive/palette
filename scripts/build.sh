#!/bin/bash

tsc

bun run scripts/inlineAuthCode.ts

sam build -t palette.processed.yml