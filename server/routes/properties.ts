import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const CHAIN_MAP: Record<number, string> = {
  137: 'polygon',
  1101: 'polygon', // Polygon zkEVM
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        status: {
          in: ['FUNDING', 'FUNDED', 'ACTIVE'],
        },
        isPaused: false,
        isListable: true,
      },
      include: {
        token: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedProperties = properties.map((property) => ({
      id: property.id,
      name: property.name,
      images: property.images.length > 0 ? property.images : (property.imageUrl ? [property.imageUrl] : []),
      APY: Number(property.annualYield),
      totalSupply: property.totalTokens,
      remainingSupply: property.availableTokens,
      description: property.description,
      region: `${property.city}, ${property.state}`,
      tokenPrice: Number(property.tokenPrice),
      chain: property.token ? (CHAIN_MAP[property.token.chainId] || 'polygon') : 'polygon',
      type: property.propertyType,
      totalValue: Number(property.totalValue),
      isPaused: property.isPaused,
      isMinted: property.isMinted,
    }));

    res.json({
      success: true,
      data: formattedProperties,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        token: true,
      },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    const formattedProperty = {
      id: property.id,
      name: property.name,
      images: property.images.length > 0 ? property.images : (property.imageUrl ? [property.imageUrl] : []),
      APY: Number(property.annualYield),
      totalSupply: property.totalTokens,
      remainingSupply: property.availableTokens,
      description: property.description,
      region: `${property.city}, ${property.state}`,
      tokenPrice: Number(property.tokenPrice),
      chain: property.token ? (CHAIN_MAP[property.token.chainId] || 'polygon') : 'polygon',
      type: property.propertyType,
      totalValue: Number(property.totalValue),
      address: property.address,
      squareFeet: property.squareFeet,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
      yearBuilt: property.yearBuilt,
      monthlyRent: property.monthlyRent ? Number(property.monthlyRent) : null,
      contractAddress: property.token?.contractAddress || null,
    };

    res.json({
      success: true,
      data: formattedProperty,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property',
    });
  }
});

export default router;
