# Makefile

.PHONY: all init install up up-dev postgres mariadb logs logs-dev down clean

all: init install up postgres mariadb

init:
	npm init -y

install:
	npm install pg mariadb

up:
	docker-compose -f docker-compose.dev.yml --env-file .env up -d

postgres:
	node scripts/postgres.js

mariadb:
	node scripts/maria.js

logs:
	docker-compose -f docker-compose.dev.yml logs -f

down:
	docker-compose down

clean:
	rm -rf node_modules package-lock.json

performance:
	node run.js