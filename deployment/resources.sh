#!/bin/bash

npm install
npm run cdk bootstrap
npm run build && npm run cdk deploy -- --parameters adminUserEmail=$ADMIN_EMAIL --verbose
