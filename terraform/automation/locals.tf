# Local values for automation configuration

locals {
  # Read deployed sites from the gitignored .deployed-sites.json file
  # This file is generated by scripts/utils/generate-deployed-sites.ts
  deployed_sites_file = file("${path.root}/../../.deployed-sites.json")
  deployed_sites = jsondecode(local.deployed_sites_file)
  
  # Use the loaded sites list, falling back to variable if file doesn't exist
  actual_deployed_sites = length(local.deployed_sites) > 0 ? local.deployed_sites : var.deployed_sites
} 