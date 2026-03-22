import { model, type InferSchemaType, Schema } from 'mongoose';

export interface IDeviceCategory {
  name: string;
}

const deviceCategorySchema = new Schema<IDeviceCategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

export type DeviceCategoryDocument = InferSchemaType<typeof deviceCategorySchema>;

export const DeviceCategoryModel = model<IDeviceCategory>('DeviceCategory', deviceCategorySchema);