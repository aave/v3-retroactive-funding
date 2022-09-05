# V3 Retroactive Funding Proposal

This repository contains the relevant code of the V3 retroactive funding governance proposal.

## Getting Started

### Setup

- Clone the repository
- run `npm install`

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an environment file named `.env` and fill out the environment variables per `example.env`

### Running in Docker

Terminal Window 1: `docker-compose up`

Once Terminal Window 1 Loaded - in a separate terminal window - Terminal Window 2:
`docker-compose exec contracts-env bash`

In Terminal Window 2, run desired scripts from npm package file (i.e `npm run compile`)

### Compile

`npm run compile`

This will compile the available smart contracts.

### Test

`npm run test`

Run an end to end test of the governance proposal on an Ethereum mainnet fork. This test also creates a fork environment of the Polygon network, where the cross-chain transaction is executed (the functioning of FxPortal bridge is mocked, impersonating the StateSender).

`npm run test-ethereum`

Run an end to end test of these contracts on an Ethereum mainnet fork. This only tests the Ethereum part of the proposal.

`npm run test-polygon`

Run an end to end test of these contracts on a Polygon fork. This only tests the Polygon part of the proposal.
