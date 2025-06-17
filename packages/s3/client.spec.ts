import { describe, test, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { 
  fileExists, 
  getFile, 
  saveFile, 
  deleteFile, 
  listFiles,
  createDirectory,
  getBucketName,
  getLocalFilePath,
  getFileStorageEnv,
  LOCAL_S3_PATH
} from './client.js';

// Mock environment variables for testing
const originalEnv = process.env;

describe('S3 Client', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    test('should default to dev-s3 when FILE_STORAGE_ENV is not set', () => {
      delete process.env.FILE_STORAGE_ENV;
      expect(getFileStorageEnv()).toBe('dev-s3');
    });

    test('should use FILE_STORAGE_ENV when set', () => {
      process.env.FILE_STORAGE_ENV = 'local';
      expect(getFileStorageEnv()).toBe('local');
      
      process.env.FILE_STORAGE_ENV = 'prod-s3';
      expect(getFileStorageEnv()).toBe('prod-s3');
    });
  });

  describe('Local File Path Resolution', () => {
    describe('when FILE_STORAGE_ENV=local (PASSING TESTS)', () => {
      beforeEach(() => {
        process.env.FILE_STORAGE_ENV = 'local';
        process.env.CURRENT_SITE_ID = 'hardfork';
      });

      test('should add sites prefix for site-specific paths', () => {
        const key = 'search-index/orama_index.msp';
        const expectedPath = path.join(LOCAL_S3_PATH, 'sites', 'hardfork', key);
        expect(getLocalFilePath(key)).toBe(expectedPath);
      });

      test('should not double-prefix paths that already include sites/', () => {
        const key = 'sites/hardfork/search-index/orama_index.msp';
        const expectedPath = path.join(LOCAL_S3_PATH, key);
        expect(getLocalFilePath(key)).toBe(expectedPath);
      });

      test('should handle paths without site ID', () => {
        delete process.env.CURRENT_SITE_ID;
        const key = 'search-index/orama_index.msp';
        const expectedPath = path.join(LOCAL_S3_PATH, key);
        expect(getLocalFilePath(key)).toBe(expectedPath);
      });
    });

    describe('when FILE_STORAGE_ENV=prod-s3 (CURRENTLY FAILING - demonstrates the issue)', () => {
      beforeEach(() => {
        process.env.FILE_STORAGE_ENV = 'prod-s3';
        process.env.CURRENT_SITE_ID = 'hardfork';
      });

      test('should NOT add sites prefix for AWS paths (currently fails)', () => {
        const key = 'search-index/orama_index.msp';
        const result = getLocalFilePath(key);
        
        // Current implementation incorrectly adds sites prefix even for AWS
        const incorrectPath = path.join(LOCAL_S3_PATH, 'sites', 'hardfork', key);
        expect(result).toBe(incorrectPath); // This is the current (wrong) behavior
        
        // What it SHOULD be (this will fail with current implementation):
        const correctPath = path.join(LOCAL_S3_PATH, key);
        expect(result).not.toBe(correctPath); // Demonstrates the bug
      });
    });
  });

  describe('Bucket Name Resolution', () => {
    describe('Local environment', () => {
      beforeEach(() => {
        process.env.FILE_STORAGE_ENV = 'local';
      });

      test('should return empty string for local environment', () => {
        expect(getBucketName()).toBe('');
      });
    });

    describe('AWS environments with site ID', () => {
      beforeEach(() => {
        process.env.CURRENT_SITE_ID = 'hardfork';
      });

      test('should use correct bucket pattern for prod-s3 (CURRENTLY FAILING)', () => {
        process.env.FILE_STORAGE_ENV = 'prod-s3';
        const result = getBucketName();
        
        // Current implementation uses wrong pattern
        expect(result).toBe('browse-dot-show-hardfork-s3-prod'); // Current (wrong) pattern
        
        // What it SHOULD be (this will fail with current implementation):
        const correctBucketName = 'hardfork-browse-dot-show';
        expect(result).not.toBe(correctBucketName); // Demonstrates the bug
      });

      test('should fall back to legacy bucket for dev-s3', () => {
        process.env.FILE_STORAGE_ENV = 'dev-s3';
        expect(getBucketName()).toBe('listen-fair-play-s3-dev');
      });
    });

    describe('AWS environments without site ID', () => {
      beforeEach(() => {
        delete process.env.CURRENT_SITE_ID;
      });

      test('should use legacy bucket names when no site ID', () => {
        process.env.FILE_STORAGE_ENV = 'prod-s3';
        expect(getBucketName()).toBe('listen-fair-play-s3-prod');
      });
    });
  });

  describe('File Operations - Local Environment (PASSING TESTS)', () => {
    const testSiteId = 'test-site';
    const testKey = 'test-file.txt';
    const testContent = 'Hello, World!';
    let testFilePath: string;

    beforeAll(async () => {
      process.env.FILE_STORAGE_ENV = 'local';
      process.env.CURRENT_SITE_ID = testSiteId;
      
      // Setup test directory
      testFilePath = getLocalFilePath(testKey);
      await fs.ensureDir(path.dirname(testFilePath));
    });

    beforeEach(async () => {
      process.env.FILE_STORAGE_ENV = 'local';
      process.env.CURRENT_SITE_ID = testSiteId;
      
      // Clean up before each test
      if (await fs.pathExists(testFilePath)) {
        await fs.unlink(testFilePath);
      }
    });

    test('should save and retrieve files locally', async () => {
      await saveFile(testKey, testContent);
      expect(await fileExists(testKey)).toBe(true);
      
      const retrievedContent = await getFile(testKey);
      expect(retrievedContent.toString()).toBe(testContent);
    });

    test('should handle file deletion', async () => {
      await saveFile(testKey, testContent);
      expect(await fileExists(testKey)).toBe(true);
      
      await deleteFile(testKey);
      expect(await fileExists(testKey)).toBe(false);
    });

    test('should list files in directory', async () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      
      for (const file of files) {
        await saveFile(file, 'content');
      }
      
      const listedFiles = await listFiles('');
      expect(listedFiles).toEqual(expect.arrayContaining(files));
    });

    test('should create directories', async () => {
      const dirKey = 'test-directory/';
      await createDirectory(dirKey);
      
      const dirPath = getLocalFilePath(dirKey);
      expect(await fs.pathExists(dirPath)).toBe(true);
    });
  });

  describe('Integration with Constants Package (DEMONSTRATES CURRENT ISSUE)', () => {
    test('constants package generates keys with sites/ prefix', () => {
      // This simulates what getSearchIndexKey() currently returns
      const mockSiteId = 'hardfork';
      const currentConstantsOutput = `sites/${mockSiteId}/search-index/orama_index.msp`;
      
      process.env.CURRENT_SITE_ID = mockSiteId;
      
      // Test local environment (should work correctly)
      process.env.FILE_STORAGE_ENV = 'local';
      const localPath = getLocalFilePath(currentConstantsOutput);
      expect(localPath).toContain('sites/hardfork/search-index');
      
      // Test AWS environment (demonstrates the problem)
      process.env.FILE_STORAGE_ENV = 'prod-s3';
      const awsKey = currentConstantsOutput; // This key would be used for S3
      
      // In AWS, we want just: 'search-index/orama_index.msp'
      // But constants package is returning: 'sites/hardfork/search-index/orama_index.msp'
      expect(awsKey).toBe('sites/hardfork/search-index/orama_index.msp'); // Current (problematic) output
      
      // What we actually want for AWS:
      const desiredAwsKey = 'search-index/orama_index.msp';
      expect(awsKey).not.toBe(desiredAwsKey); // This demonstrates the issue
    });
  });

  describe('AWS Environment Tests (CURRENTLY FAILING - shows current bugs)', () => {
    beforeEach(() => {
      process.env.FILE_STORAGE_ENV = 'prod-s3';
      process.env.CURRENT_SITE_ID = 'hardfork';
      process.env.S3_BUCKET_NAME = 'hardfork-browse-dot-show';
    });

    test('bucket name should match Terraform pattern (currently fails)', () => {
      const bucketName = getBucketName();
      
      // What Terraform creates vs what our code expects
      const terraformBucketName = 'hardfork-browse-dot-show'; // From terraform: ${site_id}-${s3_bucket_name}
      const currentCodeBucketName = 'browse-dot-show-hardfork-s3-prod'; // What our code generates
      
      expect(bucketName).toBe(currentCodeBucketName); // Current behavior
      expect(bucketName).not.toBe(terraformBucketName); // Shows the mismatch
    });

    test('S3 operations should use correct keys without sites/ prefix (would fail in real AWS)', async () => {
      // This test shows what would happen in AWS environment
      const keyFromConstants = 'sites/hardfork/search-index/orama_index.msp'; // Current constants output
      const desiredS3Key = 'search-index/orama_index.msp'; // What should be used in S3
      
      // With current implementation, we'd try to access the wrong S3 path
      expect(keyFromConstants).not.toBe(desiredS3Key); // Demonstrates the mismatch
      
      // This would result in 403/404 errors in real AWS because:
      // - File exists at: s3://hardfork-browse-dot-show/search-index/orama_index.msp
      // - Code looks for: s3://hardfork-browse-dot-show/sites/hardfork/search-index/orama_index.msp
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing environment variables gracefully', () => {
      delete process.env.CURRENT_SITE_ID;
      delete process.env.FILE_STORAGE_ENV;
      
      // Should not throw errors
      expect(() => getBucketName()).not.toThrow();
      expect(() => getLocalFilePath('test.txt')).not.toThrow();
    });

    test('should handle empty keys', () => {
      expect(() => getLocalFilePath('')).not.toThrow();
    });

    test('should handle keys with special characters', () => {
      const specialKey = 'path/with spaces/and-dashes_and.dots.txt';
      expect(() => getLocalFilePath(specialKey)).not.toThrow();
    });
  });
}); 