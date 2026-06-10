.PHONY: setup run check format docker-build docker-up docker-down logs

setup:
	npm install

run:
	npm start

check:
	npm run lint

format:
	npm run format

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

logs:
	docker compose logs -f