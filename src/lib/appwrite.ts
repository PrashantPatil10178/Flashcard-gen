import { Client, Account, Databases, Storage, ID } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const FLASHCARD_SETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_SETS_COLLECTION_ID!;
export const STORAGE_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!;

export { ID };
