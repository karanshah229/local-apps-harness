# Private deployment contract

Applications are built from the repository root, run through `infra/docker-compose.yml`, and enter through Nginx on host port 80. This workspace deliberately exposes that entrypoint to the local network; Tailscale Serve is an optional tailnet entrypoint. A release is identified by its validated local Git checkpoint.

The deploy workflow must validate connected changes, create and verify the registered local backup, build an immutable checkpoint-tagged image, ask for approval immediately before changing the live service, then verify health and confirmed smoke journeys. Restore the prior image and configuration when verification fails.

AWS, EKS, Kubernetes, and Terraform are outside the default home-server path.
