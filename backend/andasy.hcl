# andasy.hcl app configuration file generated for isokolinkrwanda on Thursday, 29-Oct-26 22:55:16 SAST
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
