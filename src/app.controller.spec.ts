/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VerifyAccountDto } from './common/dtos/verify-account.dto';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  const mockAppService = {
    getHello: jest.fn(),
    getBanks: jest.fn(),
    verifyAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return "Hello World!" from AppService', () => {
      const expected = 'Hello World!';
      mockAppService.getHello.mockReturnValue(expected);

      const result = controller.getHello();

      expect(result).toBe(expected);
      expect(appService.getHello).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBanks', () => {
    it('should return banks from AppService', async () => {
      const banks = [
        { code: '001', name: 'Bank A' },
        { code: '002', name: 'Bank B' },
      ];
      mockAppService.getBanks.mockResolvedValue(banks);

      const result = await controller.getBanks();

      expect(result).toEqual(banks);
      expect(appService.getBanks).toHaveBeenCalledTimes(1);
    });

    it('should propagate Error if no banks found', async () => {
      mockAppService.getBanks.mockRejectedValue(new Error('No banks found'));

      await expect(controller.getBanks()).rejects.toThrow('No banks found');
      expect(appService.getBanks).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyAccount', () => {
    it('should verify account successfully', async () => {
      const verifyAccountDto: VerifyAccountDto = {
        accountNumber: '1234567890',
        bankCode: '001',
      };
      const mockResponse = {
        accountName: 'John Doe',
        accountNumber: '1234567890',
      };
      mockAppService.verifyAccount.mockResolvedValue(mockResponse);

      const result = await controller.verifyAccount(verifyAccountDto);

      expect(result).toEqual(mockResponse);
      expect(appService.verifyAccount).toHaveBeenCalledWith(
        verifyAccountDto.accountNumber,
        verifyAccountDto.bankCode,
      );

      expect(appService.verifyAccount).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from AppService', async () => {
      const verifyAccountDto: VerifyAccountDto = {
        accountNumber: '1234567890',
        bankCode: '001',
      };
      const error = new Error('Account verification failed');
      mockAppService.verifyAccount.mockRejectedValue(error);

      await expect(controller.verifyAccount(verifyAccountDto)).rejects.toThrow(
        'Account verification failed',
      );
      expect(appService.verifyAccount).toHaveBeenCalledWith(
        verifyAccountDto.accountNumber,
        verifyAccountDto.bankCode,
      );

      expect(appService.verifyAccount).toHaveBeenCalledTimes(1);
    });
  });
});
