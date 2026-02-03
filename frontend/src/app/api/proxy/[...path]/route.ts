import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:8000';

async function proxyRequest(request: NextRequest, path: string) {
  const url = `${BACKEND_URL}/api/${path}`;

  // 원본 요청의 헤더를 복사
  const headers = new Headers();

  // Authorization 헤더 전달
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  // Content-Type 헤더 전달
  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  // 요청 옵션 설정
  const options: RequestInit = {
    method: request.method,
    headers: headers,
  };

  // GET/HEAD가 아닌 경우 body 전달
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    } catch {
      // body가 없을 수 있음
    }
  }

  console.log(`[Proxy] ${request.method} ${url}`);
  console.log(`[Proxy] Authorization: ${authHeader ? 'present' : 'missing'}`);

  try {
    const response = await fetch(url, options);
    const data = await response.text();

    console.log(`[Proxy] Response status: ${response.status}`);

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { detail: 'Backend server error' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}
