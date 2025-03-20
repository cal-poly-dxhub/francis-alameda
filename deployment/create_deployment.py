import boto3
import time
from datetime import datetime
import os
import socket

# Constants
TAG_KEY = "dxhub-project"
TAG_VALUE = "alameda-deployment"

INSTANCE_TYPE = "t4g.micro"  # ARM-based instance type
REGION = boto3.Session().region_name or "us-west-2"
IMAGE_ID = "ami-0345469b8a1ca112a"  # For ARM Amazon Linux 2023
REPO_URL = "https://github.com/cal-poly-dxhub/francis-alameda"
REPO_BRANCH = "deployment"
GIT_CLONE_CMD = f"git clone -b {REPO_BRANCH} {REPO_URL} /home/ec2-user/alameda"

print(f"Using region: {REGION}")
print(f"Using AMI: {IMAGE_ID}")

ec2 = boto3.client("ec2", region_name=REGION)

# Create key pair
KEY_NAME = f"deployment-arm-key-{datetime.now().strftime('%Y%m%d%H%M%S')}"
KEY_FILE = f"./deployment/{KEY_NAME}.pem"

print(f"Creating new key pair: {KEY_NAME}")
key_pair = ec2.create_key_pair(
    KeyName=KEY_NAME, TagSpecifications=[{"ResourceType": "key-pair", "Tags": [{"Key": TAG_KEY, "Value": TAG_VALUE}]}]
)

with open(KEY_FILE, "w") as file:
    file.write(key_pair["KeyMaterial"])

# Set proper permissions for the key file
os.chmod(KEY_FILE, 0o400)
print(f"Key pair created and saved to: {KEY_FILE}")

# Create security group
SG_NAME = f"alameda-arm-sg-{datetime.now().strftime('%Y%m%d%H%M%S')}"
print(f"Creating security group: {SG_NAME}")

vpcs = ec2.describe_vpcs(Filters=[{"Name": "isDefault", "Values": ["true"]}])
VPC_ID = vpcs["Vpcs"][0]["VpcId"]

security_group = ec2.create_security_group(
    GroupName=SG_NAME,
    Description="Security group for Alameda deployment ARM instance",
    VpcId=VPC_ID,
    TagSpecifications=[{"ResourceType": "security-group", "Tags": [{"Key": TAG_KEY, "Value": TAG_VALUE}]}],
)
SECURITY_GROUP = security_group["GroupId"]
print(f"Created security group: {SECURITY_GROUP}")

# Add SSH access rule
print("Adding SSH access rule to security group...")
ec2.authorize_security_group_ingress(
    GroupId=SECURITY_GROUP,
    IpPermissions=[{"IpProtocol": "tcp", "FromPort": 22, "ToPort": 22, "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}],
)

# Get a subnet in the default VPC
print("Finding subnet in VPC...")
subnets = ec2.describe_subnets(Filters=[{"Name": "vpc-id", "Values": [VPC_ID]}])
SUBNET_ID = subnets["Subnets"][0]["SubnetId"]


# User data script to install git and clone a repository
USER_DATA = """#!/bin/bash
yum update -y
yum install -y git

# Switch to ec2-user and clone the repository
sudo -u ec2-user -i <<'EOF'
cd /home/ec2-user
git clone https://github.com/your-repo/your-project.git
EOF
"""

# Launch the EC2 instance
print("Launching EC2 instance...")
instances = ec2.run_instances(
    ImageId=IMAGE_ID,
    InstanceType=INSTANCE_TYPE,
    KeyName=KEY_NAME,
    SecurityGroupIds=[SECURITY_GROUP],
    SubnetId=SUBNET_ID,
    TagSpecifications=[{"ResourceType": "instance", "Tags": [{"Key": TAG_KEY, "Value": TAG_VALUE}]}],
    MinCount=1,
    MaxCount=1,
)
INSTANCE_ID = instances["Instances"][0]["InstanceId"]
print(f"Instance created with ID: {INSTANCE_ID}")

# Wait for the instance to be running
print("Waiting for instance to start...")
ec2.get_waiter("instance_running").wait(InstanceIds=[INSTANCE_ID])

# Get the public IP address
instance_description = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
PUBLIC_IP = instance_description["Reservations"][0]["Instances"][0]["PublicIpAddress"]

print("=====================================================")
print("Instance setup complete!")
print(f"Instance ID: {INSTANCE_ID}")
print(f"Public IP: {PUBLIC_IP}")
print(f"Key file: {KEY_FILE}")
print("")
print(f"Connect using: ssh ec2-user@{PUBLIC_IP} -i {KEY_FILE}")
print("=====================================================")

# Wait for SSH to be available
print("Waiting for SSH to become available...")

while True:
    try:
        with socket.create_connection((PUBLIC_IP, 22), timeout=2):
            break
    except (socket.timeout, ConnectionRefusedError):
        time.sleep(5)

print("SSH is available. You can now connect to your instance.")
