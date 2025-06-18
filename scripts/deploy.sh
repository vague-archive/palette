#!/bin/bash
if [[ -z $1 ]]; then
    echo "No environment provided"
    exit 1
fi

sam deploy --stack-name palette-$1 --guided \
    --tags pod=collab env=$1

CLOUDFRONT_KVS=$(aws cloudformation describe-stacks \
  --stack-name palette-$1 \
  --query "Stacks[0].Outputs[?OutputKey=='SigningSecretStoreArn'].OutputValue" \
  --output text)

KEY_VALUE_STORE_ETAG=$(aws cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn $CLOUDFRONT_KVS \
  --query ETag \
  --output text)

# TODO: Get the secret id from the platform stack stood up by share team
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id platform-signing-key \
  --query SecretString \
  --output text)

aws cloudfront-keyvaluestore put-key \
  --kvs-arn $CLOUDFRONT_KVS \
  --if-match $KEY_VALUE_STORE_ETAG \
  --key signing-key \
  --value $SECRET
