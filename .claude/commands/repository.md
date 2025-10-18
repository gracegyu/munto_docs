---
title: '레포지토리 생성 도우미'
read_only: true
type: 'command'
version: '1.0.0'
---

# 🗄️ 레포지토리 자동 생성기

API 인터페이스를 바탕으로 Either<Failure, T> 패턴의 레포지토리를 자동 생성합니다.

**사용법**: `/repository [domain] [features?]`

**입력값**: $ARGUMENTS

## ⚠️ 중요 제약사항 ⚠️
입력값 ($ARGUMENTS)이 다음 조건을 만족하지 않는 경우:
- 1-2개의 인자 (도메인명, 선택적 기능 목록)
- 도메인명: PascalCase (예: User, Matching, Chat)

다음을 수행해야 합니다:
1. "사용법: /repository [domain] [features?]" 출력
2. "예시: /repository User 'profile,auth,settings'" 출력
3. 즉시 중단

## Step 1: API 인터페이스 분석

### 1.1 기존 API 파일 읽기
- `lib/source/data/apis/[domain_lower]_api.dart` 존재 확인
- API 메소드 시그니처 분석
- 파라미터 타입 및 반환 타입 추출
- **주석 정보**: 각 메소드의 역할, 용도, 에러 처리 방식 파악

### 1.2 메소드 카테고리 분류
**기본 CRUD 메소드**:
- `getList()` → `getList()`
- `getById()` → `getById()`  
- `create()` → `create()`
- `update()` → `update()`
- `delete()` → `delete()`

**커스텀 메소드**:
- 비즈니스 로직별로 분류
- 복잡한 쿼리 파라미터 처리
- 파일 업로드/다운로드

### 1.3 에러 처리 패턴 결정
- 네트워크 에러 → `Failure.networkError()`
- 인증 에러 → `Failure.unauthorizedError()`
- 비즈니스 로직 에러 → `Failure.businessError()`

## Step 2: 레포지토리 구조 설계

### 2.1 단일 vs 다중 레포지토리
**단일 레포지토리** (기본):
- 간단한 CRUD 위주의 도메인
- 예: `UserRepository`

**다중 레포지토리** (복잡한 도메인):
- 기능별 분리가 필요한 경우
- 예: `UserProfileRepository`, `UserAuthRepository`, `UserSettingsRepository`

### 2.2 메소드 시그니처 패턴
```dart
Future<Either<Failure, T>> methodName(parameters) async {
  try {
    final response = await _api.methodName(parameters);
    _logger.d('메소드 성공 로그');
    return Right(response);
  } catch (e) {
    _logger.e('메소드 실패 로그', error: e);
    return Left(Failure.networkError(message: '에러 메시지'));
  }
}
```

## Step 3: 레포지토리 클래스 생성

### 3.1 파일 위치
```
lib/source/data/repository/[domain_lower]_repository.dart
```

### 3.2 기본 레포지토리 템플릿
```dart
import 'package:dartz/dartz.dart';
import 'package:dating_package/foundation/data/error/failure.dart';
import 'package:dating_package/source/data/apis/[domain_lower]_api.dart';
import 'package:dating_package/source/domain/model/[domain_lower]/[domain_lower]_model.dart';
import 'package:logger/logger.dart';

/// [Domain] 레포지토리
/// 
/// [Domain] 관련 모든 데이터 처리를 담당하며, API 호출 결과를 Either 패턴으로 래핑하여 반환
class [Domain]Repository {
  final [Domain]Api _api;
  final Logger _logger = Logger();

  [Domain]Repository(this._api);

  /// [Domain] 목록 조회
  /// 
  /// 페이지네이션과 검색 기능을 지원하는 목록 조회
  /// 
  /// [page] 페이지 번호 (기본값: 1)
  /// [limit] 페이지당 항목 수 (기본값: 20)
  /// [search] 검색 키워드 (선택사항)
  /// 
  /// Returns:
  /// - Success: [Domain] 목록
  /// - Failure: 네트워크 오류, 서버 오류 등
  Future<Either<Failure, List<[Domain]>>> getList({
    int? page,
    int? limit,
    String? search,
  }) async {
    try {
      final response = await _api.getList(
        page: page,
        limit: limit,
        search: search,
      );
      _logger.d('[Domain] 목록 조회 성공: ${response.length}개');
      return Right(response);
    } catch (e) {
      _logger.e('[Domain] 목록 조회 실패', error: e);
      return Left(Failure.networkError(message: '[Domain] 목록 조회 실패'));
    }
  }

  /// [Domain] 상세 조회
  /// 
  /// 특정 ID의 [Domain] 상세 정보를 조회
  /// 
  /// [id] 조회할 [Domain]의 고유 식별자
  /// 
  /// Returns:
  /// - Success: [Domain] 상세 정보
  /// - Failure: 네트워크 오류, 존재하지 않는 ID 등
  Future<Either<Failure, [Domain]>> getById(String id) async {
    try {
      final response = await _api.getById(id);
      _logger.d('[Domain] 상세 조회 성공: $id');
      return Right(response);
    } catch (e) {
      _logger.e('[Domain] 상세 조회 실패: $id', error: e);
      return Left(Failure.networkError(message: '[Domain] 상세 조회 실패'));
    }
  }

  /// [Domain] 생성
  Future<Either<Failure, [Domain]>> create(Map<String, dynamic> request) async {
    try {
      final response = await _api.create(request);
      _logger.d('[Domain] 생성 성공');
      return Right(response);
    } catch (e) {
      _logger.e('[Domain] 생성 실패', error: e);
      return Left(Failure.networkError(message: '[Domain] 생성 실패'));
    }
  }

  /// [Domain] 수정
  Future<Either<Failure, [Domain]>> update(
    String id,
    Map<String, dynamic> request,
  ) async {
    try {
      final response = await _api.update(id, request);
      _logger.d('[Domain] 수정 성공: $id');
      return Right(response);
    } catch (e) {
      _logger.e('[Domain] 수정 실패: $id', error: e);
      return Left(Failure.networkError(message: '[Domain] 수정 실패'));
    }
  }

  /// [Domain] 삭제
  Future<Either<Failure, void>> delete(String id) async {
    try {
      await _api.delete(id);
      _logger.d('[Domain] 삭제 성공: $id');
      return const Right(null);
    } catch (e) {
      _logger.e('[Domain] 삭제 실패: $id', error: e);
      return Left(Failure.networkError(message: '[Domain] 삭제 실패'));
    }
  }
}
```

### 3.3 데이팅 서비스 특화 메소드
```dart
/// 프로필 상세 조회 (재화 차감)
/// 
/// [useCurrency]가 true인 경우 재화를 차감하고 상세 정보를 제공
Future<Either<Failure, User>> viewProfileDetail({
  required String datingUserId,
  bool useCurrency = false,
}) async {
  try {
    final request = {'useCurrency': useCurrency};
    final response = await _api.viewProfileDetail(datingUserId, request);
    _logger.d('프로필 상세 조회 성공: $datingUserId (재화 사용: $useCurrency)');
    return Right(response);
  } catch (e) {
    _logger.e('프로필 상세 조회 실패: $datingUserId', error: e);
    return Left(Failure.networkError(message: '프로필 상세 조회 실패'));
  }
}

/// 위치 기반 프로필 검색
Future<Either<Failure, List<User>>> getNearbyProfiles({
  required double latitude,
  required double longitude,
  int radiusKm = 10,
}) async {
  try {
    final response = await _api.getNearbyProfiles(
      latitude: latitude,
      longitude: longitude,
      radiusKm: radiusKm,
    );
    _logger.d('주변 프로필 검색 성공: ${response.length}개 (반경 ${radiusKm}km)');
    return Right(response);
  } catch (e) {
    _logger.e('주변 프로필 검색 실패', error: e);
    return Left(Failure.networkError(message: '주변 프로필 검색 실패'));
  }
}
```

## Step 4: 에러 처리 및 로깅

### 4.1 세분화된 에러 처리
```dart
Future<Either<Failure, T>> _handleApiCall<T>(
  Future<T> Function() apiCall,
  String operation,
) async {
  try {
    final response = await apiCall();
    _logger.d('$operation 성공');
    return Right(response);
  } on DioException catch (e) {
    _logger.e('$operation API 오류', error: e);
    
    switch (e.response?.statusCode) {
      case 400:
        return Left(Failure.validationError(message: '잘못된 요청입니다'));
      case 401:
        return Left(Failure.unauthorizedError(message: '인증이 필요합니다'));
      case 403:
        return Left(Failure.forbiddenError(message: '권한이 없습니다'));
      case 404:
        return Left(Failure.notFoundError(message: '리소스를 찾을 수 없습니다'));
      case 409:
        return Left(Failure.businessError(message: '중복된 데이터입니다'));
      default:
        return Left(Failure.networkError(message: '$operation 실패'));
    }
  } catch (e) {
    _logger.e('$operation 예상치 못한 오류', error: e);
    return Left(Failure.unknownError(message: '$operation 중 오류 발생'));
  }
}
```

### 4.2 개인정보 보호 로깅
```dart
/// 개인정보가 포함된 로그는 프로덕션에서 제외
void _logSafely(String message, {dynamic data}) {
  if (kDebugMode) {
    _logger.d(message, data);
  } else {
    // 개인정보 포함 가능한 필드들을 마스킹
    final maskedMessage = message.replaceAll(
      RegExp(r'email|phone|address|name|birth|location', caseSensitive: false), 
      '[REDACTED]'
    );
    _logger.d(maskedMessage);
  }
}
```

## Step 5: 캐싱 및 최적화

### 5.1 메모리 캐싱 (선택적)
```dart
/// 프로필 목록 캐시 (5분)
Map<String, CachedData<List<User>>> _profileCache = {};

Future<Either<Failure, List<User>>> getProfilesWithCache({
  String? filterType,
  Duration cacheDuration = const Duration(minutes: 5),
}) async {
  final cacheKey = 'profiles_$filterType';
  final cached = _profileCache[cacheKey];
  
  if (cached != null && !cached.isExpired) {
    _logger.d('프로필 목록 캐시 사용');
    return Right(cached.data);
  }

  final result = await getProfiles(filterType: filterType);
  result.fold(
    (failure) => null,
    (data) => _profileCache[cacheKey] = CachedData(data, cacheDuration),
  );
  
  return result;
}
```

## Step 6: 테스트 지원

### 6.1 Mock 메소드 제공
```dart
/// 테스트용 Mock 데이터 반환
Future<Either<Failure, List<[Domain]>>> getMockList() async {
  await Future.delayed(const Duration(milliseconds: 500)); // 네트워크 지연 시뮬레이션
  
  final mockData = List.generate(10, (index) => [Domain].mock().copyWith(
    id: index + 1,
    name: '테스트 [Domain] ${index + 1}',
  ));
  
  return Right(mockData);
}
```

## 사용 예시

```bash
# 기본 레포지토리 생성
/repository User

# 기능별 분리된 레포지토리
/repository User "profile,auth,settings"

# 매칭 서비스 레포지토리
/repository Matching "like,pass,matches"

# 채팅 레포지토리
/repository Chat "rooms,messages,notifications"
```

## 결과 보고 형식

```markdown
# 🗄️ 레포지토리 생성 완료

## 생성된 파일
- lib/source/data/repository/[domain_lower]_repository.dart

## 구현된 메소드
- getList() - Either<Failure, List<T>>
- getById() - Either<Failure, T>
- create() - Either<Failure, T>
- update() - Either<Failure, T>
- delete() - Either<Failure, void>
- [커스텀 메소드들...]

## 에러 처리
- 네트워크 에러 처리
- 인증/권한 에러 처리
- 비즈니스 로직 에러 처리
- 상세 로깅

## 다음 단계
1. DI 모듈에 레포지토리 등록
2. BLoC 생성: `/bloc [Domain]`
3. 테스트 코드 작성
```
