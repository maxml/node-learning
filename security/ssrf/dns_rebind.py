#!/usr/bin/env python3
# Dependency-free DNS server for the rebinding demo.
# For the rebind name it alternates answers with TTL 0:
#   1st query  -> PUBLIC_IP   (passes a "resolve then validate IP is public" check)
#   2nd query  -> INTERNAL_IP (the connect that fetch() makes right after)
# Every other name gets PUBLIC_IP. Run with -I; reads env REBIND_NAME/PUBLIC_IP/INTERNAL_IP.
import os, socket, struct, sys

REBIND = (os.environ.get('REBIND_NAME', 'rebind.test') + '.').lower()
PUBLIC_IP = os.environ.get('PUBLIC_IP', '192.0.2.1')      # TEST-NET-1, non-private? no: 192.0.2 is documentation range, treated public by our check
INTERNAL_IP = os.environ.get('INTERNAL_IP', '127.0.0.1')

counter = {}

def parse_name(data, off):
    labels = []
    while True:
        ln = data[off]
        if ln == 0:
            off += 1
            break
        labels.append(data[off+1:off+1+ln].decode())
        off += 1 + ln
    return '.'.join(labels) + '.', off

def qtype_of(data):
    off = 12
    while data[off] != 0:
        off += 1 + data[off]
    off += 1
    (qtype,) = struct.unpack('>H', data[off:off+2])
    return qtype, off

def build_response(data, ip, qend, answer=True):
    tid = data[:2]
    flags = b'\x81\x80'  # standard response, no error
    qdcount = data[4:6]
    ancount = b'\x00\x01' if (answer and ip) else b'\x00\x00'
    header = tid + flags + qdcount + ancount + b'\x00\x00\x00\x00'
    question = data[12:qend+4]
    body = b''
    if answer and ip:
        # pointer to name at 0x0c, type A, class IN, TTL 0, 4-byte addr
        body = b'\xc0\x0c' + b'\x00\x01' + b'\x00\x01' + struct.pack('>I', 0) + b'\x00\x04'
        body += socket.inet_aton(ip)
    return header + question + body

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('0.0.0.0', 53))
    sys.stderr.write(f'dns up; rebind={REBIND} public={PUBLIC_IP} internal={INTERNAL_IP}\n')
    sys.stderr.flush()
    while True:
        data, addr = s.recvfrom(512)
        try:
            name, _ = parse_name(data, 12)
            name = name.lower()
            qtype, qend = qtype_of(data)
            # only A queries (type 1) get an address; AAAA (28) -> empty NOERROR,
            # so the resolver falls back to A and our A-counter alternates cleanly.
            if qtype != 1:
                s.sendto(build_response(data, None, qend, answer=False), addr)
                sys.stderr.write(f'q {name} type={qtype} -> (empty)\n'); sys.stderr.flush()
                continue
            if name == REBIND:
                n = counter.get(name, 0)
                counter[name] = n + 1
                ip = PUBLIC_IP if n == 0 else INTERNAL_IP
            else:
                ip = PUBLIC_IP
            s.sendto(build_response(data, ip, qend), addr)
            sys.stderr.write(f'q {name} A#{counter.get(name,0)} -> {ip}\n'); sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f'err {e}\n'); sys.stderr.flush()

main()
