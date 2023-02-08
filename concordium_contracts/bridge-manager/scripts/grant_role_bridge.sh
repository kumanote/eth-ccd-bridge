#!/bin/bash

cc contract update 5145 \
	--entrypoint grantRole \
	--sender=hadesgames-mobile \
	--energy=3000 \
	--parameter-json ./scripts/grant_role.json \
	--schema=./scripts/schema.bin