import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';

@Injectable()
export class KarmaService {
  private readonly logger = new Logger(KarmaService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async checkKarma(identifier: string): Promise<{
    karmaIdentity: string;
    amountInContention: string;
    reason: string;
  }> {
    const url = `${this.configService.get<string>('LENDSQR_BASE_URL')}/verification/karma/${identifier}`;
    const token = this.configService.get<string>('LENDSQR_API_KEY');

    const { data: response } = await firstValueFrom(
      this.httpService
        .get<{
          status: string;
          message: string;
          data: {
            karmaIdentity: string;
            amountInContention: string;
            reason: string;
          };
        }>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error('Error fetching karma data', error);
            throw error;
          }),
        ),
    );

    if (response?.status !== 'success') {
      throw new Error(response?.message || 'Karma check failed');
    }

    if (!response?.data) {
      throw new NotFoundException('No data returned from karma check');
    }

    return response.data;
  }
}
