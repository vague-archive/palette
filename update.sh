#!/bin/bash
if [[ -z $1 ]]; then
    echo "No environment provided"
    exit 1
fi


aws cloudformation update-stack --stack-name palette-$1 \
    --template-body file://palette.yml \
    --parameters ParameterKey=AssetBucketName,ParameterValue=palette-assets \
    --tags Key=pod,Value=collab Key=env,Value=$1