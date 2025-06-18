# Project Boilerplate

> **Note:** For instructions on setting up a Generative AI project using this boilerplate, see [config/GENAI_SETUP.md](config/GENAI_SETUP.md).

## Required Changes

- `project/`: change `project` with actual project name.
- `project/celery.py`: change `project` with actual project name.
- `project/core/middleware/logging.py`: change `project` with actual project name.
- `project/core/apps.py`: change `project` with actual project name.
- `project/users/apps.py`: change `project` with actual project name.
- `config/settings/base.py`: change `project` with actual project name.
- `config/settings/sentry.py`: change `project` with actual project name.
- `config/env/.env.example`: change `project` with actual project name.
- `pyproject.toml`: change `project` with actual project name.
- `tasks.yml`: change following in ansible-playbook
  - `<host-group-name>`: specify host group name
  - `<repo-url>`: specify repository URL
  - `<branch-name>`: specify branch name
  - `<project-dir>`: specify project directory/path to clone into
  - `<make-target>`: specify target name for `make` command
  - `<env-name>`: specify environment name
- `README.md`: remove section "Required Changes"

### Environment Setup

- Copy ENV file `cp config/env/.env.example .env`
- Update env variables

### Pre Commit Hook

- Install pre-commit package: `pip3 install pre-commit`
- Activate pre-commit hook: `pre-commit install`

## Commands

### To add a new package

- put your package name & version in appropriate `config/requirements/*.in` file
- run `make cr`

### (dev | stage | prod) ENV. Specific Commands

replace \* with appropriate ENV. name

- `make *.build` : build containers
- `make *.up.d` : start containers in detached mode
- `make *.up` : start containers in attached mode
- `make *.down` : stop containers and remove networks
- `make *.restart` : firsts stop containers then start again
- `make *.logs` : attach to log console of containers
- `make *.dcshell` : open django container shell
- `make *.dshell` : open django shell
- `make *.ipshell` : open django ipython shell
- `make *.makemigrations` : run `makemigrations` command in django container
- `make *.migrate` : run `migrate` command in django container
- `make *.collectstatic`: run `collectstatic` command in django container
- `make *.psql` : run `psql` in postgres container
- `make *.rediscli` : run `redis cli` in redis container

### Common Commands

- `make cr` : compile requirements
- `make test` : run Django tests
- `make *.attach` : attach to specified container

## Enable SSL with Certbot

### (stage|prod)
1. update domain in `config/nginx/(stage|prod).conf`
2. specify domain, mode, and compose file for `init-letsencrypt.sh`
```
sudo ./init-letsencrypt.sh <domain> <mode> <docker-compose-file>
sudo ./init-letsencrypt.sh example.org 1 docker-compose.stage.yml # will fetch dummy certificates for specified domain
sudo ./init-letsencrypt.sh example.org 0 docker-compose.stage.yml # will fetch real certificates for specified domain
```
