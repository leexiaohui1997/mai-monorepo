import { Router } from 'express';
import { ProviderManager } from '../providers/manager';
import type { ApiResponse } from '../providers/types';

const router = Router();
const manager = new ProviderManager();

// GET /api/providers - 列表查询
router.get('/', async (req, res) => {
  try {
    const providers = await manager.listProviders();
    res.json({ success: true, data: providers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/providers/:id - 详情查询
router.get('/:id', async (req, res) => {
  try {
    const provider = await manager['storage'].findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, data: provider });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/providers - 创建供应商
router.post('/', async (req, res) => {
  try {
    const provider = await manager.createProvider(req.body);
    res.status(201).json({ success: true, data: provider });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/providers/:id - 更新供应商
router.put('/:id', async (req, res) => {
  try {
    const provider = await manager.updateProvider(req.params.id, req.body);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, data: provider });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/providers/:id - 删除供应商
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await manager.deleteProvider(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/providers/:id/test - 测试连接
router.post('/:id/test', async (req, res) => {
  try {
    const result = await manager.testConnection(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/providers/:id/set-default - 设为默认
router.post('/:id/set-default', async (req, res) => {
  try {
    const provider = await manager.setDefaultProvider(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, data: provider });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
