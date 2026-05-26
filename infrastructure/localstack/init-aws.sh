#!/bin/bash
# LocalStack initialization — runs on first start
# Creates S3 buckets needed by FarmLink

set -e

echo ">>> FarmLink LocalStack Init: Creating S3 buckets..."

# Main media bucket (photos, satellite snapshots)
awslocal s3 mb s3://farmlink-media --region ap-southeast-1

# Set CORS policy so the LIFF app can upload directly
awslocal s3api put-bucket-cors --bucket farmlink-media --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Set bucket policy to allow public GET (for serving images)
awslocal s3api put-bucket-policy --bucket farmlink-media --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::farmlink-media/*"
    }
  ]
}'

echo ">>> FarmLink LocalStack Init: Done!"
awslocal s3 ls
