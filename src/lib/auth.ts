import { account, ID } from "./appwrite";

export interface User {
  $id: string;
  name: string;
  email: string;
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const user = await account.get();
    return user as User;
  } catch {
    return null;
  }
};

export const login = async (email: string, password: string) => {
  return await account.createEmailPasswordSession(email, password);
};

export const register = async (
  email: string,
  password: string,
  name: string
) => {
  return await account.create(ID.unique(), email, password, name);
};

export const logout = async () => {
  return await account.deleteSession("current");
};
