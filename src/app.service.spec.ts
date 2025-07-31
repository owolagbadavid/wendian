/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PaymentService } from './common/services/payment.service';
import { BankRepository } from './db/repositories/bank.repository';
import { DEFAULT_COUNTRY } from './common/constants';

describe('AppService', () => {
  let service: AppService;
  let paymentService: jest.Mocked<PaymentService>;
  let bankRepo: jest.Mocked<BankRepository>;

  const mockPaymentService = {
    getBanks: jest.fn(),
    verifyAccount: jest.fn(),
  };

  const mockBankRepo = {
    findAll: jest.fn(),
    insertMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: BankRepository,
          useValue: mockBankRepo,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    paymentService = module.get(PaymentService);
    bankRepo = module.get(BankRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      const result = service.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  describe('getBanks', () => {
    it('should return saved banks if they exist', async () => {
      const savedBanks = [
        { bank_code: '001', bank_name: 'Bank A' },
        { bank_code: '002', bank_name: 'Bank B' },
      ];
      mockBankRepo.findAll.mockResolvedValue(savedBanks);

      const result = await service.getBanks();

      expect(result).toEqual([
        { code: '001', name: 'Bank A' },
        { code: '002', name: 'Bank B' },
      ]);
      expect(bankRepo.findAll).toHaveBeenCalledTimes(1);
      expect(paymentService.getBanks).not.toHaveBeenCalled();
      expect(bankRepo.insertMany).not.toHaveBeenCalled();
    });

    it('should fetch and insert banks if none are saved', async () => {
      const fetchedBanks = [
        { code: '003', name: 'Bank C' },
        { code: '004', name: 'Bank D' },
      ];
      mockBankRepo.findAll.mockResolvedValue([]);
      mockPaymentService.getBanks.mockResolvedValue(fetchedBanks);
      mockBankRepo.insertMany.mockResolvedValue(undefined);

      const result = await service.getBanks();

      expect(result).toEqual(fetchedBanks);
      expect(bankRepo.findAll).toHaveBeenCalledTimes(1);
      expect(paymentService.getBanks).toHaveBeenCalledWith(DEFAULT_COUNTRY);
      expect(bankRepo.insertMany).toHaveBeenCalledWith([
        { bank_code: '003', bank_name: 'Bank C' },
        { bank_code: '004', bank_name: 'Bank D' },
      ]);

      expect(bankRepo.insertMany).toHaveBeenCalledTimes(1);
    });

    it('should throw Error if no banks are found', async () => {
      mockBankRepo.findAll.mockResolvedValue([]);
      mockPaymentService.getBanks.mockResolvedValue([]);

      await expect(service.getBanks()).rejects.toThrow('No banks found');
      expect(bankRepo.findAll).toHaveBeenCalledTimes(1);
      expect(paymentService.getBanks).toHaveBeenCalledWith(DEFAULT_COUNTRY);
      expect(bankRepo.insertMany).not.toHaveBeenCalled();
    });

    it('should throw Error if getBanks returns null', async () => {
      mockBankRepo.findAll.mockResolvedValue([]);
      mockPaymentService.getBanks.mockResolvedValue(null);

      await expect(service.getBanks()).rejects.toThrow('No banks found');
      expect(bankRepo.findAll).toHaveBeenCalledTimes(1);
      expect(paymentService.getBanks).toHaveBeenCalledWith(DEFAULT_COUNTRY);
      expect(bankRepo.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('verifyAccount', () => {
    it('should verify account successfully', async () => {
      const accountNumber = '1234567890';
      const bankCode = '001';
      const mockResponse = { accountName: 'John Doe', accountNumber };
      mockPaymentService.verifyAccount.mockResolvedValue(mockResponse);

      const result = await service.verifyAccount(accountNumber, bankCode);

      expect(result).toEqual(mockResponse);
      expect(paymentService.verifyAccount).toHaveBeenCalledWith({
        accountNumber,
        bankCode,
      });

      expect(paymentService.verifyAccount).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from paymentService', async () => {
      const accountNumber = '1234567890';
      const bankCode = '001';
      const error = new Error('Account verification failed');
      mockPaymentService.verifyAccount.mockRejectedValue(error);

      await expect(
        service.verifyAccount(accountNumber, bankCode),
      ).rejects.toThrow('Account verification failed');
      expect(paymentService.verifyAccount).toHaveBeenCalledWith({
        accountNumber,
        bankCode,
      });

      expect(paymentService.verifyAccount).toHaveBeenCalledTimes(1);
    });
  });
});
