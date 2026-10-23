import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole, UserStatus } from '../../database/models/user.model';
import { CategoryStatus } from '../../database/models/category.model';
import { SentenceStatus, SentenceDifficulty } from '../../database/models/sentence.model';
import { LessonStatus } from '../../database/models/daily-lesson.model';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSentenceDto,
  UpdateSentenceDto,
  BulkImportSentencesDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';

@ApiTags('Admin Panel')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 1. Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get back-office analytics, content metrics and recent activity' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // 2. Users
  @Get('users')
  @ApiOperation({ summary: 'List and search users with pagination' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      search,
      role,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 15,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details and historical learning progress' })
  async getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserDetail(id);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user account status (ACTIVE, INACTIVE, SUSPENDED)' })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role (USER, ADMIN)' })
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto);
  }

  // 3. Categories
  @Get('categories')
  @ApiOperation({ summary: 'List all categories with live sentence counts' })
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new learning category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update category details, sort order, and status' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Safe delete or deactivate category' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCategory(id);
  }

  // 4. Sentences
  @Get('sentences')
  @ApiOperation({ summary: 'List and filter sentences by category and difficulty' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: SentenceDifficulty })
  @ApiQuery({ name: 'status', required: false, enum: SentenceStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSentences(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: SentenceDifficulty,
    @Query('status') status?: SentenceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getSentences({
      search,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      difficulty,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 15,
    });
  }

  @Post('sentences')
  @ApiOperation({ summary: 'Create a single sentence' })
  async createSentence(@Body() dto: CreateSentenceDto) {
    return this.adminService.createSentence(dto);
  }

  @Put('sentences/:id')
  @ApiOperation({ summary: 'Update sentence contents, difficulty, or audio association' })
  async updateSentence(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSentenceDto,
  ) {
    return this.adminService.updateSentence(id, dto);
  }

  @Delete('sentences/:id')
  @ApiOperation({ summary: 'Safe delete or deactivate sentence' })
  async deleteSentence(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteSentence(id);
  }

  @Post('sentences/bulk-import')
  @ApiOperation({ summary: 'Bulk import sentences from CSV with validation and duplicate checks' })
  async bulkImportSentences(@Body() dto: BulkImportSentencesDto) {
    return this.adminService.bulkImportSentences(dto);
  }

  // 5. Lesson Management
  @Get('lessons')
  @ApiOperation({ summary: 'Inspect daily lessons and assigned sentence snapshots' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LessonStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLessons(
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('status') status?: LessonStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getLessons({
      userId: userId ? parseInt(userId, 10) : undefined,
      date,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 15,
    });
  }

  // 6. Quiz Inspection
  @Get('quizzes')
  @ApiOperation({ summary: 'Audit quiz attempts and scores' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getQuizzes(
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getQuizzes({
      userId: userId ? parseInt(userId, 10) : undefined,
      date,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 15,
    });
  }

  // 7. Activity Logs
  @Get('activity')
  @ApiOperation({ summary: 'System activity logs and audit trail' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'activityType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getActivityLogs(
    @Query('userId') userId?: string,
    @Query('activityType') activityType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getActivityLogs({
      userId: userId ? parseInt(userId, 10) : undefined,
      activityType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
