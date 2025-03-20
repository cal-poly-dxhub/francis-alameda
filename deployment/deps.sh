#!/bin/bash

set -e

sudo yum update -y

if ! command -v curl &> /dev/null; then
    sudo yum install -y curl
fi

curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g npm@11.2.0

sudo yum install -y python3 python3-pip

sudo yum install -y awscli

sudo yum install -y jq

sudo yum clean all
