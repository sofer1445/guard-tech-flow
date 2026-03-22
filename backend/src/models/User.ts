import { model, type InferSchemaType, Schema } from 'mongoose';

export interface IUser {
  userId: string;
  name: string;
  role: string;
}

const userSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = model<IUser>('User', userSchema);
