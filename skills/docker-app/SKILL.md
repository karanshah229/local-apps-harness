# Skill: Docker & Container Management

This guide covers building, running, and troubleshooting services in Docker containers.

## Essential Docker CLI commands

### Build a Service Image
```bash
docker build -t <image-name> -f <path-to-Dockerfile> .
```

### Run a Container
```bash
docker run -d -p <host-port>:<container-port> --name <container-name> <image-name>
```

### View Running Containers
```bash
docker ps
```

### View Logs
```bash
docker logs -f <container-name>
```

### Access Container Shell
```bash
docker exec -it <container-name> sh
```

### Clean Up Unused Resources
```bash
docker system prune -f
```

## Docker Compose Commands

### Start All Services (Detached Mode)
```bash
docker compose up -d
```

### Stop All Services
```bash
docker compose down
```

### Rebuild and Restart
```bash
docker compose up -d --build
```
