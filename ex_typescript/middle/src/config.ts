const dev = {
  server: {
    port: 8000,
  },
  database: {
    server: "mongodb://localhost:27017/starter",
  },
  auth: {
    secret: "nE=P2gn+sjNY`6h",
  },
};

const prod = {
  server: {
    port: 8000,
  },
  database: {
    server: "mongodb://localhost:27017/starter",
  },
  auth: {
    secret: "x1~4mon.zrF12o7",
  },
};

export const config = process.env.NODE_ENV === "production" ? prod : dev;
