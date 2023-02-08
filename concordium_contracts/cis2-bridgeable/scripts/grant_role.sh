#!/bin/bash

cc contract update 5138 \
	--entrypoint grantRole \
	--sender=hadesgames-mobile \
	--energy=3000 \
	--parameter-json ./scripts/grant_role.json \
	--schema=./scripts/schema.bin