# Custom domain setup — StickSmart (GitHub Pages)

Everything needed to point a custom domain at the live site. Nothing here is
applied yet — the GitHub side is deliberately **not** configured until the domain
is actually owned, because setting a custom domain you don't control would break
the current URL.

- **Current live site:** <https://01101110011001010110110001100001.github.io/TripleThr3at/>
- **CNAME target (for a subdomain / `www`):** `01101110011001010110110001100001.github.io`

## Who does what

| Step | Who | Notes |
|---|---|---|
| Buy the domain | **You** | ~$10–15/yr (Cloudflare, Namecheap, Porkbun…) |
| Add the DNS records (below) | **You** | At the registrar / DNS provider — needs your login |
| Add `frontend/CNAME` + set the Pages custom domain | **Claude** | One push; I'll do it once you give me the domain |
| Wait for DNS verification, enable **Enforce HTTPS** | **Claude** | After propagation (minutes–hours) |
| Confirm the site serves on the domain | **Claude** | Final check |

I **cannot** buy the domain or log into your registrar (that's the one part that
has to be you). Once the records are in and you tell me the domain, the GitHub
side is a couple of minutes.

## Option A — subdomain (recommended, simplest)

Example: `app.yourdomain.com` or `stick.yourdomain.com`.

Add **one** DNS record at your registrar:

| Type | Name / Host | Value / Target |
|---|---|---|
| `CNAME` | `app` (the subdomain part) | `01101110011001010110110001100001.github.io` |

That's it — subdomains verify fastest and avoid apex-record quirks.

## Option B — apex/root domain

Example: `yourdomain.com` (plus `www`).

Add **A** records (IPv4) and, ideally, **AAAA** records (IPv6) for the root,
pointing at GitHub Pages, and a `CNAME` for `www`:

| Type | Name / Host | Value |
|---|---|---|
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `01101110011001010110110001100001.github.io` |

> These are GitHub Pages' current published IPs. They rarely change, but if it's
> been a while, confirm against GitHub's "Managing a custom domain" docs before
> relying on them. If your registrar is **Cloudflare**, set these records to
> **DNS only (grey cloud)**, not proxied, during setup/verification.

## What I run on the GitHub side (once the domain is live)

1. Add `frontend/CNAME` containing just the domain (e.g. `app.yourdomain.com`) so
   every Actions deploy keeps the custom domain.
2. Set it as the Pages custom domain:
   `gh api -X PUT repos/01101110011001010110110001100001/TripleThr3at/pages -f cname='app.yourdomain.com'`
3. After GitHub verifies DNS, enable HTTPS:
   `gh api -X PUT repos/.../pages -F https_enforced=true`
4. Load the domain and confirm the app renders + assets are `200`.

## Verify DNS yourself (optional)

```bash
# subdomain should resolve to the github.io target
dig +short app.yourdomain.com
# apex should return the four GitHub IPs
dig +short yourdomain.com
```

## Gotchas

- **Propagation isn't instant** — DNS can take minutes to a few hours. HTTPS
  certs are only issued *after* GitHub verifies the domain.
- **Don't** add the `CNAME` file before the DNS points at GitHub — it can take the
  github.io URL offline in the meantime.
- Keeping Pages free means the repo stays **public**. If it ever goes private,
  Pages stops and we'd move to Netlify/Cloudflare Pages instead.
