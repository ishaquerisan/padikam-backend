import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: App | null = null;

  constructor(private configService: ConfigService) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0]!;
        return;
      }

      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const serviceAccountPathOrJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY');

      if (serviceAccountPathOrJson) {
        let credentialObj: any;
        if (serviceAccountPathOrJson.trim().startsWith('{')) {
          credentialObj = JSON.parse(serviceAccountPathOrJson);
        } else if (fs.existsSync(serviceAccountPathOrJson)) {
          credentialObj = JSON.parse(fs.readFileSync(serviceAccountPathOrJson, 'utf-8'));
        }

        if (credentialObj) {
          this.firebaseApp = initializeApp({
            credential: cert(credentialObj),
            projectId: projectId || credentialObj.project_id,
          });
          this.logger.log(`Firebase Admin initialized with service account for project: ${this.firebaseApp.options.projectId}`);
          return;
        }
      }

      if (projectId) {
        this.firebaseApp = initializeApp({
          projectId,
        });
        this.logger.log(`Firebase Admin initialized with project ID: ${projectId}`);
      } else {
        this.logger.warn('FIREBASE_PROJECT_ID is not configured. Token verification will fall back to Google public tokeninfo endpoint.');
      }
    } catch (error: any) {
      this.logger.warn(`Firebase Admin initialization notice: ${error.message}. Will use public Google token verification fallback.`);
    }
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedException('Missing or invalid Firebase ID token');
    }

    // 1. First attempt: Verify using Firebase Admin SDK if initialized
    if (this.firebaseApp) {
      try {
        const decoded = await getAuth(this.firebaseApp).verifyIdToken(idToken);
        if (!decoded.email) {
          throw new UnauthorizedException('Firebase account does not have an associated email address');
        }

        return {
          uid: decoded.uid,
          email: decoded.email.toLowerCase().trim(),
          name: decoded.name || decoded.email.split('@')[0],
          picture: decoded.picture,
          emailVerified: !!decoded.email_verified,
        };
      } catch (err: any) {
        this.logger.warn(`Firebase Admin verification attempt failed (${err.message}). Trying public endpoint fallback...`);
      }
    }

    // 2. Second attempt / Fallback: Verify via Google TokenInfo public API endpoint
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Google token validation failed: ${errBody}`);
      }

      const data: any = await response.json();

      const expectedProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      if (expectedProjectId && data.aud && data.aud !== expectedProjectId) {
        this.logger.warn(`Token audience (${data.aud}) does not match configured FIREBASE_PROJECT_ID (${expectedProjectId})`);
      }

      if (!data.email) {
        throw new UnauthorizedException('Google account did not return an email address');
      }

      return {
        uid: data.sub || data.user_id,
        email: (data.email as string).toLowerCase().trim(),
        name: data.name || (data.email as string).split('@')[0],
        picture: data.picture,
        emailVerified: data.email_verified === 'true' || data.email_verified === true,
      };
    } catch (fallbackErr: any) {
      this.logger.error(`Failed to verify Google/Firebase token: ${fallbackErr.message}`);
      throw new UnauthorizedException('Authentication failed: Invalid or expired Google Firebase token');
    }
  }
}
