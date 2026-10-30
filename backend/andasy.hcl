# andasy.hcl app configuration file generated for isokolinkrwanda on Friday, 30-Oct-26 12:06:46 SAST
#
# See https://github.com/quarksgroup/andasy-cli for information about how to use this file.

app_name = "isokolinkrwanda"

app {

  env = {}

  port = 3000

  primary_region = "fsn"

  compute {
    cpu      = 1
    memory   = 256
    cpu_kind = "shared"
  }

  process {
    name = "isokolinkrwanda"
  }

}
