aws_region     = "us-east-1"
aws_profile    = "iwltr"
site_id        = "iwltr"
s3_bucket_name = "browse-dot-show"

# Automation role configuration  
automation_account_id = 184601568981
create_automation_role = true
deployed_sites = ["iwltr"]
site_account_ids = {
  "iwltr" = "184601568981"
}

# Custom domain configuration
custom_domain_name = "iwantlistenthisrubbish.com"
root_domain_name = "iwantlistenthisrubbish.com"
enable_custom_domain_on_cloudfront = true

# Lambda warming
enable_search_lambda_warming = true
search_lambda_warming_schedule = "rate(5 minutes)"

# Logging
log_level = "info"

## OPTIONAL

## Search lambda configuration
# search_lambda_memory_size = 3008  # Adjust based on your podcast size / max observed memory usage

## SRT indexing Lambda configuration
# srt_indexing_lambda_memory_size = 3008 # Adjust based on your podcast size / max observed memory usage