import { NextRequest, NextResponse } from 'next/server';
import { googleSearch, getGoogleSearchPageHtml } from './search';
import { CommandOptions } from './types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" or "query" is required' },
        { status: 400 }
      );
    }

    // Parse options from query parameters
    const options: CommandOptions = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      timeout: searchParams.get('timeout') ? parseInt(searchParams.get('timeout')!) : 60000,
      locale: searchParams.get('locale') || 'en-US',
      stateFile: searchParams.get('stateFile') || './browser-state.json',
      noSaveState: searchParams.get('noSaveState') === 'true',
    };

    // Check if user wants HTML response
    const returnHtml = searchParams.get('html') === 'true';
    const saveToFile = searchParams.get('saveToFile') === 'true';
    const outputPath = searchParams.get('outputPath') || undefined;

    if (returnHtml) {
      // Return raw HTML
      const htmlResponse = await getGoogleSearchPageHtml(
        query,
        options,
        saveToFile,
        outputPath
      );
      // Ensure response is JSON serializable
      const serializedResponse = JSON.parse(JSON.stringify(htmlResponse || { query, html: '', url: '' }));
      return NextResponse.json(serializedResponse);
    } else {
      // Return parsed search results
      const searchResponse = await googleSearch(query, options);
      // Ensure response is JSON serializable
      const serializedResponse = JSON.parse(JSON.stringify(searchResponse || { query, results: [] }));
      return NextResponse.json(serializedResponse);
    }
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, options = {}, returnHtml = false, saveToFile = false, outputPath } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required in request body' },
        { status: 400 }
      );
    }

    // Set default options
    const searchOptions: CommandOptions = {
      limit: options.limit || 10,
      timeout: options.timeout || 60000,
      locale: options.locale || 'en-US',
      stateFile: options.stateFile || './browser-state.json',
      noSaveState: options.noSaveState || false,
    };

    if (returnHtml) {
      // Return raw HTML
      const htmlResponse = await getGoogleSearchPageHtml(
        query,
        searchOptions,
        saveToFile,
        outputPath
      );
      // Ensure response is JSON serializable
      const serializedResponse = JSON.parse(JSON.stringify(htmlResponse || { query, html: '', url: '' }));
      return NextResponse.json(serializedResponse);
    } else {
      // Return parsed search results
      const searchResponse = await googleSearch(query, searchOptions);
      // Ensure response is JSON serializable
      const serializedResponse = JSON.parse(JSON.stringify(searchResponse || { query, results: [] }));
      return NextResponse.json(serializedResponse);
    }
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}