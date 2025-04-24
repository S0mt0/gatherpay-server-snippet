import {
  Global,
  Injectable,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as stream from 'stream';
import { v2 as cloudinary } from 'cloudinary';

import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from '../../constants';

@Global()
@Injectable()
export class CloudinaryService implements OnModuleInit {
  private u_preset: string;
  allowedFileTypes = ['image/jpg', 'image/png', 'image/jpeg'];
  maxFileSize = 5000000; // 5MB

  constructor(private configService: ConfigService) {
    this.u_preset = this.configService.get(CLOUDINARY_UPLOAD_PRESET);
  }

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get(CLOUDINARY_CLOUD_NAME),
      api_key: this.configService.get(CLOUDINARY_API_KEY),
      api_secret: this.configService.get(CLOUDINARY_API_SECRET),
      secure: true,
    });
  }

  async validateFile(file: Express.Multer.File) {
    if (!file || !Object.keys(file).length)
      throw new UnprocessableEntityException('No file provided');

    if (!this.allowedFileTypes.includes(file.mimetype))
      throw new UnprocessableEntityException('File type unsupported');

    if (file.size > this.maxFileSize)
      throw new UnprocessableEntityException('File size too large');

    return `IMG_${Date.now()}`;
  }

  async uploadFileStream(file: Express.Multer.File): Promise<{ url: string }> {
    const public_id = await this.validateFile(file);

    const uploadStream = new stream.PassThrough();
    uploadStream.end(file.buffer);

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          upload_preset: this.u_preset,
          resource_type: 'image',
          public_id,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url });
        },
      );

      uploadStream.pipe(upload);
    });
  }

  async uploadFile(file: Express.Multer.File) {
    const public_id = await this.validateFile(file);

    // Convert buffer to data URI
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      upload_preset: this.u_preset,
      resource_type: 'image',
      public_id,
    });

    const url = uploadResponse.secure_url;
    return { url };
  }

  async deleteFile(url: string) {
    const parts = url?.split('/');
    let fileName = '';

    if (parts) fileName = parts[parts?.length - 1].split('.')[0];

    const old_public_id = `${this.u_preset}/${fileName}`;

    await cloudinary.uploader.destroy(old_public_id, {
      invalidate: true,
      resource_type: 'image',
    });
  }
}
