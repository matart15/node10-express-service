"use strict";

const express = require("express");
// const app = express();
const bodyParser = require("body-parser");
import { prisma } from "./generated/prisma-client";
import datamodelInfo from "./generated/nexus-prisma";
import * as path from "path";
import { stringArg, idArg } from "nexus";
import { prismaObjectType, makePrismaSchema } from "nexus-prisma";
import { GraphQLServer } from "graphql-yoga";

const Query = prismaObjectType({
  name: "Query",
  definition(t) {
    t.prismaFields(["post", "users"]);
    t.list.field("feed", {
      type: "Post",
      resolve: (_, args, ctx) =>
        ctx.prisma.posts({ where: { published: true } })
    });
    t.list.field("postsByUser", {
      type: "Post",
      args: { email: stringArg() },
      resolve: (_, { email }, ctx) =>
        ctx.prisma.posts({ where: { author: { email } } })
    });
  }
});

const Mutation = prismaObjectType({
  name: "Mutation",
  definition(t) {
    t.prismaFields(["createUser", "deletePost"]);
    t.field("createDraft", {
      type: "Post",
      args: {
        title: stringArg(),
        authorId: idArg({ nullable: true })
      },
      resolve: (_, { title, authorId }, ctx) =>
        ctx.prisma.createPost({
          title,
          author: { connect: { id: authorId } }
        })
    });
    t.field("publish", {
      type: "Post",
      nullable: true,
      args: { id: idArg() },
      resolve: (_, { id }, ctx) =>
        ctx.prisma.updatePost({
          where: { id },
          data: { published: true }
        })
    });
  }
});

const schema = makePrismaSchema({
  types: [Query, Mutation],

  prisma: {
    datamodelInfo,
    client: prisma
  },

  outputs: {
    schema: path.join(__dirname, "./generated/schema.graphql"),
    typegen: path.join(__dirname, "./generated/nexus.ts")
  }
});
const server = new GraphQLServer({
  schema,
  context: { prisma }
});
export const app = server.express;

server.start({ port: 3000 }, () =>
  console.log("Server is running on http://localhost:4000")
);

// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.text({ type: "text/*" }));
app.disable("x-powered-by");
