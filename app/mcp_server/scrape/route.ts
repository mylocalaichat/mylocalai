import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from './scrape';
import { CommandOptions } from '../search/types';

export async function GET(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, options = {}, saveToFile = false, outputPath } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required in request body' },
        { status: 400 }
      );
    }

    // Set default options
    const scrapeOptions: CommandOptions = {
      timeout: options.timeout || 60000,
      locale: options.locale || 'en-US',
      stateFile: options.stateFile || './storage/browser-state.json',
      noSaveState: options.noSaveState || false,
    };

    const scrapeResponse = await scrapeUrl(url, scrapeOptions, saveToFile, outputPath);
    // Ensure response is JSON serializable
    const serializedResponse = JSON.parse(JSON.stringify(scrapeResponse || { query: url, html: '', url: '' }));
    return NextResponse.json(serializedResponse);
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, options = {}, saveToFile = false, outputPath } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required in request body' },
        { status: 400 }
      );
    }

    // Set default options
    const scrapeOptions: CommandOptions = {
      timeout: options.timeout || 60000,
      locale: options.locale || 'en-US',
      stateFile: options.stateFile || './storage/browser-state.json',
      noSaveState: options.noSaveState || false,
    };

    const scrapeResponse = await scrapeUrl(url, scrapeOptions, saveToFile, outputPath);
    // Ensure response is JSON serializable
    const serializedResponse = JSON.parse(JSON.stringify(scrapeResponse || { query: url, html: '', url: '' }));
    return NextResponse.json(serializedResponse);
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}