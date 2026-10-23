import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { getDatabaseConfig } from './config/database.config';
import { databaseModels } from './database/models';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { UserCategoriesModule } from './modules/user-categories/user-categories.module';
import { UserSettingsModule } from './modules/user-settings/user-settings.module';
import { DailyLessonsModule } from './modules/daily-lessons/daily-lessons.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ActivityModule } from './modules/activity/activity.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SentencesModule } from './modules/sentences/sentences.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SequelizeModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),
    SequelizeModule.forFeature(databaseModels),
    AuthModule,
    CategoriesModule,
    UserCategoriesModule,
    UserSettingsModule,
    DailyLessonsModule,
    QuizzesModule,
    FavoritesModule,
    ActivityModule,
    DashboardModule,
    SentencesModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
