provider "aws" {
  region = var.region
}

resource "aws_lambda_function" "this" {
  filename      = "./build/lambda.zip"
  function_name = "valheim_backup_${var.world}"
  role          = aws_iam_role.this.arn
  handler       = "src/index.handler"

  memory_size = 512
  timeout     = 30

  source_code_hash = filebase64sha256("./build/lambda.zip")

  runtime = "nodejs12.x"

  environment {
    variables = {
      SERVER_ID = var.server_id
      API_KEY   = var.api_key
      HOST      = var.host
      BUCKET    = var.bucket
      WORLD     = var.world
      REGION    = var.region
    }
  }
}

data "aws_iam_policy_document" "lambda_access" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "valheim_backup_role"
  assume_role_policy = data.aws_iam_policy_document.lambda_access.json
}

data "aws_iam_policy_document" "logging" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
      "logs:GetLogEvents",
      "logs:PutRetentionPolicy"
    ]

    resources = [
      "arn:aws:logs:${var.region}:${var.account}:log-group:/aws/lambda/${aws_lambda_function.this.function_name}:log-stream:*"
    ]
  }
}

resource "aws_iam_role_policy" "logging" {
  name   = "valheim_backup_logging"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.logging.json
}

resource "aws_cloudwatch_log_group" "logging" {
  name              = "/aws/lambda/${aws_lambda_function.this.function_name}"
  retention_in_days = 14
}

data "aws_iam_policy_document" "s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl"
    ]
    resources = [
      "arn:aws:s3:::${var.bucket}/backups/*",
    ]
  }
}

resource "aws_iam_role_policy" "s3" {
  name   = "lambda_s3"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.s3.json
}

resource "aws_s3_bucket" "primary" {
  bucket        = var.bucket
  acl           = "private"
  force_destroy = true

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["HEAD", "PUT", "POST", "GET", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2", "ETag"]
    max_age_seconds = 3000
  }

  lifecycle_rule {
    abort_incomplete_multipart_upload_days = 0
    enabled                                = true
    id                                     = "Backup Cleaning"
    prefix                                 = "backups/"

    expiration {
      days                         = 21
      expired_object_delete_marker = false
    }
  }
}

resource "aws_cloudwatch_event_rule" "this" {
    name = "backup_${var.world}_to_${var.bucket}"
    description = "Runs a backup of the Valheim World: ${var.world}"
    schedule_expression = "cron(45 7 * * ? *)"
}

resource "aws_cloudwatch_event_target" "this" {
  rule = aws_cloudwatch_event_rule.this.name
  arn  = aws_lambda_function.this.arn
}

resource "aws_lambda_permission" "invoke_lambda" {
  statement_id = "AllowRuleExecution-${aws_lambda_function.this.function_name}"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal = "events.amazonaws.com"
  source_arn = aws_cloudwatch_event_rule.this.arn
}
