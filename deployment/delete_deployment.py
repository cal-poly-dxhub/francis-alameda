import boto3

# Configuration variables
REGION = boto3.Session().region_name or "us-west-2"
TAG_KEY = "dxhub-project"
TAG_VALUE = "alameda-deployment"

print(f"Using region: {REGION}")

ec2 = boto3.client("ec2", region_name=REGION)

# Find and terminate the EC2 instance
print("Finding EC2 instance...")
instances = ec2.describe_instances(
    Filters=[{"Name": f"tag:{TAG_KEY}", "Values": [TAG_VALUE]}, {"Name": "instance-state-name", "Values": ["running", "stopped"]}]
)

instance_ids = [instance["InstanceId"] for reservation in instances["Reservations"] for instance in reservation["Instances"]]

if instance_ids:
    print(f"Terminating instances: {instance_ids}")
    ec2.terminate_instances(InstanceIds=instance_ids)
    ec2.get_waiter("instance_terminated").wait(InstanceIds=instance_ids)
    print("Instances terminated.")
else:
    print("No instances found.")

# Find and delete the security group
print("Finding security group...")
security_groups = ec2.describe_security_groups(Filters=[{"Name": f"tag:{TAG_KEY}", "Values": [TAG_VALUE]}])

security_group_ids = [sg["GroupId"] for sg in security_groups["SecurityGroups"]]

for sg_id in security_group_ids:
    print(f"Deleting security group: {sg_id}")
    ec2.delete_security_group(GroupId=sg_id)
    print("Security group deleted.")

# Find and delete the key pair
print("Finding key pair...")
key_pairs = ec2.describe_key_pairs(Filters=[{"Name": f"tag:{TAG_KEY}", "Values": [TAG_VALUE]}])

key_pair_names = [kp["KeyName"] for kp in key_pairs["KeyPairs"]]

for key_name in key_pair_names:
    print(f"Deleting key pair: {key_name}")
    ec2.delete_key_pair(KeyName=key_name)
    print("Key pair deleted.")

print("All resources deleted.")
