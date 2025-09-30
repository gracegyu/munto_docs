# PostgreSQL 인덱싱 완전 정복: 성능 향상을 위한 실전 가이드

## 문서 목적

이 문서는 초급 개발자들이 PostgreSQL의 인덱싱 개념을 명확히 이해하고, 실제 서비스 성능을 향상시킬 수 있도록 돕기 위한 실전형 인덱싱 교과서입니다. 인덱스가 어떻게 작동하는지, 어떤 인덱스를 어떤 상황에 써야 하는지, 다국어 환경과 같이 복잡한 환경에서 어떻게 인덱싱을 최적화해야 하는지를 다룹니다.

## 타깃 독자

- 인덱스에 대한 기초 지식이 부족한 초급/중급 개발자
- PostgreSQL을 실제 프로젝트에서 사용하는 백엔드 개발자
- 글로벌 서비스를 운영하며 다국어 검색 성능이 중요한 시스템을 다루는 아키텍트 및 DBA

---

# 1. 인덱스가 없다면?

인덱스가 없는 경우, PostgreSQL은 테이블의 모든 레코드를 스캔(Sequential Scan)합니다. 레코드 수가 많을수록 검색 시간은 선형적으로 증가합니다. 즉, 테이블이 수십만, 수백만 건이 되면 검색 성능은 급격히 저하됩니다.

예:

```
SELECT * FROM patient WHERE name = 'John';

```

---

인덱스 없음: 모든 행을 하나씩 검사

- 인덱스 있음: 트리 탐색으로 빠르게 해당 row 탐색

---

# 2. 기본 인덱스: Primary Key와 B-Tree

### Primary Key는 자동 인덱스

```
CREATE TABLE patient (
    id SERIAL PRIMARY KEY,
    name TEXT
);
```

---

- 위 예시에서 `id` 컬럼에는 자동으로 B-Tree 인덱스가 생성됩니다.

### PostgreSQL 기본 인덱스는 B-Tree

PostgreSQL의 `CREATE INDEX` 명령어로 생성하는 기본 인덱스는 B-Tree입니다.

### B-Tree 인덱스의 특징

- 정확한 값 찾기 (Exact match): 빠름
- 앞부분 매치 (Prefix match): 빠름
- 중간 또는 뒷부분 검색: 느림

**예:** `WHERE name LIKE 'App%'` → 빠름

**예:** `WHERE name LIKE '%ple'` → 느림 (인덱스 사용 안 됨)

---

# 3. 검색 문법 정리 (LIKE, ILIKE 등)

| 문법               | 설명                           | 인덱스 사용 여부             |
| ------------------ | ------------------------------ | ---------------------------- |
| `LIKE 'abc%'`      | 앞부분 매칭                    | O (B-Tree 인덱스 사용 가능)  |
| `LIKE '%abc'`      | 끝부분 매칭                    | X (Sequential Scan)          |
| `ILIKE 'abc%'`     | 대소문자 구분 없이 매칭        | X (기본적으로 인덱스 미사용) |
| `ILIKE` + `citext` | case-insensitive + 인덱스 가능 | O                            |

※ 대소문자 구분 없는 검색을 하려면 [`citext`](https://www.postgresql.org/docs/current/citext.html) 확장을 사용하는 것이 일반적입니다.

`citext`는 `TEXT`와 동일하게 작동하지만, 내부적으로 모든 비교를 대소문자 구분 없이 처리합니다. 이 확장을 사용하려면 다음과 같이 먼저 확장을 설치해야 합니다:

```
CREATE EXTENSION IF NOT EXISTS citext;
```

---

이후 컬럼을 정의할 때 `citext` 타입으로 지정하면, 기본적으로 대소문자 구분 없이 동작하며 인덱스도 이에 맞게 생성됩니다:

```
CREATE TABLE patient (
    name CITEXT
);
CREATE INDEX idx_patient_name_citext ON patient(name);
```

---

검색 시에도 일반적인 `=` 연산이나 `ILIKE`, `LIKE` 문법을 사용할 수 있으며 인덱스를 활용합니다:

```
-- 대소문자 구분 없이 빠르게 검색 가능
SELECT * FROM patient WHERE name = 'john';
SELECT * FROM patient WHERE name LIKE 'jo%';
```

---

### 비교: 대소문자 구분 있는 vs 없는 인덱스 생성

### 대소문자 구분 O

```
CREATE TABLE user_data (
    username TEXT
);
CREATE INDEX idx_username ON user_data(username);
-- 검색 시: WHERE username = 'Alice';
```

---

### 대소문자 구분 X (`citext`)

```
CREATE TABLE user_data (
    username CITEXT
);
CREATE INDEX idx_username_ci ON user_data(username);
-- 검색 시: WHERE username = 'alice'; 또는 'Alice'; 동일하게 매칭됨
```

---

`citext`는 별도의 lower() 함수를 사용하지 않아도 되고, 코드도 깔끔하게 유지할 수 있어서 다국어 환경에서 대소문자 무시가 필요한 경우 매우 유용합니다.

---

# 4. AND/OR 검색 성능 최적화 전략

복합 조건 검색에서 `AND` 또는 `OR`를 사용할 때도 인덱스 설계에 따라 성능이 큰 차이를 보입니다.

### AND 조건의 인덱스 주의점

- `A AND B` 형태의 검색에서 **B만 인덱스가 있고 A는 없으면** 인덱스가 무시되고 전체 테이블 스캔이 발생할 수 있습니다.
- 따라서 두 조건 모두에 인덱스가 있어야 인덱스 병합(Index AND 또는 Bitmap AND)이 가능합니다.

| **Bitmap Index Scan이란?** Bitmap Index Scan은 여러 개의 인덱스를 동시에 활용할 수 있게 해주는 PostgreSQL의 고급 기능입니다. • 각 인덱스를 스캔하여 **bit map**으로 결과를 저장하고, • 이 bit map들을 AND/OR 연산하여 실제로 필요한 레코드만 빠르게 찾습니다. • 메모리 상에서 조합이 이뤄지므로 **여러 인덱스를 동시에 활용해야 할 때 유리**합니다. 예를 들어 `is_active`, `region` 각각에 단일 인덱스가 있을 때 `is_active = true AND region = 'Asia'` 조건이 주어지면:

1. `is_active = true` 조건에 맞는 row 위치를 비트맵으로 표시
2. `region = 'Asia'` 조건에 맞는 row 위치를 또 비트맵으로 표시
3. 두 비트맵을 AND 연산하여 실제 대상 row만 추출

`EXPLAIN ANALYZE SELECT * FROM users WHERE is_active = true AND region = 'Asia';`

`이때 실행 계획에서 Bitmap Index Scan, BitmapAnd와 Bitmap Heap Scan을 볼 수 있습니다.` ※ 복합 인덱스를 만들기 어려운 경우, PostgreSQL이 자동으로 이 방식으로 최적화해줄 수 있습니다. **Bitmap Index Scan의 한계** • 비트맵은 메모리에 로딩되어 연산되므로, **매우 많은 row가 매칭되면 메모리 사용량이 급증**하고 성능이 오히려 저하될 수 있습니다. • 특히 반환 row 수가 수십만 건 이상일 경우 `Bitmap Heap Scan`이 오히려 `Seq Scan`보다 느려질 수 있습니다. • PostgreSQL은 이 상황에서 내부적으로 cost 계산을 통해 Seq Scan으로 전략을 바꾸기도 합니다. **적절한 사용 전략** • **선택도가 높은(매칭 row가 적은)** 조건들에 대한 인덱스를 사용할 때 유리합니다. • **전체 row 중 일부 조건만 만족하는 상황** (예: `is_active = true AND region = 'Asia'` 같은 경우)에 효과적 • **다중 조건 조합을 위해 복합 인덱스를 무작정 만들기 어려울 때** 유용한 대안입니다. | | --- |

```
-- 느린 경우:
SELECT * FROM users WHERE is_active = true AND region = 'Asia';
-- → region만 인덱스가 있으면 전체 스캔

-- 빠르게 만들기 위한 인덱스:
CREATE INDEX idx_users_isactive_region ON users(is_active, region);
```

---

- 단, `region, is_active`로 인덱스를 만들고 `WHERE is_active = true AND region = 'Asia'`라고 쓰면 PostgreSQL은 효율적으로 활용하지 못할 수 있습니다.
- **가급적 인덱스 순서에 맞춰 검색 조건도 작성**하는 것이 좋습니다. 예: `region AND is_active`

### 복합 인덱스를 너무 많이 만들 수는 없음

- `A AND B`, `A AND C`, `B AND C`, `A AND B AND C` 등 가능한 조합을 모두 인덱스로 만들 수는 없습니다.
- 가장 자주 쓰는 조건 조합만 골라서 **복합 인덱스**를 만들고, 나머지는 PostgreSQL의 `Bitmap Index Scan`에 맡기도록 설계합니다.

### OR 조건의 특징

- `OR` 조건은 PostgreSQL에서 **조건별로 인덱스를 분리해 사용**할 수 있지만, 인덱스가 없거나 인덱스 조건이 많으면 `Bitmap OR` 또는 `Seq Scan`으로 대체됩니다.

```
-- 예시: 조건별로 인덱스가 있을 때
SELECT * FROM users WHERE name = 'Alice' OR email = 'alice@example.com';
-- → name, email 각각 인덱스가 있다면 인덱스 OR 사용 가능

-- OR 조건에 인덱스가 하나라도 없으면 느려짐
```

---

### AND/OR 혼합 조건 최적화 요령

```
SELECT * FROM users
WHERE (region = 'Asia' OR region = 'Europe')
AND is_active = true;
```

---

- 위와 같은 경우, `region`과 `is_active` 각각에 인덱스가 있어야 최적의 성능이 나옵니다.
- 또는 `partial index` 전략도 고려:

```
-- is_active = true 조건에만 적용되는 인덱스
CREATE INDEX idx_active_users_region ON users(region) WHERE is_active = true;
```

---

### 📌 정리

| 상황      | 인덱스 설계 팁                                  |
| --------- | ----------------------------------------------- |
| A AND B   | A, B 모두 단일 또는 복합 인덱스 필요. 순서 유의 |
| A OR B    | A, B 모두 인덱스 필요. Bitmap OR 사용 가능      |
| 혼합 조건 | 조건별 인덱스 + Partial Index 전략 활용         |

---

# 5. JOIN 성능을 위한 인덱싱 전략

조인을 잘못 설계하면 인덱스가 있어도 성능 저하가 생길 수 있습니다. 특히 대용량 테이블 간의 JOIN에서는 적절한 인덱스 없이는 병목이 발생합니다.

### 왜 JOIN에 인덱스가 중요한가?

- JOIN은 내부적으로 두 테이블의 데이터를 비교합니다.
- 조인 조건에 사용되는 컬럼에 인덱스가 없으면, 전체 테이블 스캔이 발생할 수 있습니다.
- 특히 중첩 반복(Nested Loop Join)의 경우 작은 테이블의 각 row에 대해 큰 테이블을 반복 스캔하게 됩니다.

### 자주 쓰는 JOIN 예시

```
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'Asia';
```

---

### 인덱싱 요령

| 상황                            | 인덱스 추천                                   |
| ------------------------------- | --------------------------------------------- |
| JOIN 키가 되는 외래 키(FK) 컬럼 | B-Tree 인덱스 생성 (예: `orders.customer_id`) |
| WHERE 조건 컬럼                 | 해당 컬럼에 인덱스 (예: `customers.region`)   |
| 정렬이 필요한 컬럼              | ORDER BY 대상 컬럼에 인덱스                   |

### LEFT JOIN vs INNER JOIN 인덱스 차이

- `LEFT JOIN` 시에는 **오른쪽 테이블(FK 쪽)**에 인덱스가 없으면 성능 저하
- `INNER JOIN`은 양쪽 테이블에 인덱스가 있을수록 효율적

### 예시: INNER JOIN

```
SELECT o.id, c.name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'Asia';
```

---

- `orders.customer_id`에 인덱스 필요
- `customers.region`에 인덱스 필요

### 예시: LEFT JOIN

```
SELECT c.id, o.order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.region = 'Asia';
```

---

- 이 경우 `orders.customer_id`에 인덱스 없으면 조인 시 비효율 발생
- `LEFT JOIN`은 **왼쪽 테이블이 기준**이기 때문에, 오른쪽 테이블에 인덱스가 중요함

### 실전 예시: FK에 인덱스 생성

```
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    region TEXT
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    order_date DATE
);

-- FK에 인덱스 추가
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
-- 조건 컬럼에도 인덱스 추가
CREATE INDEX idx_customers_region ON customers(region);
```

---

이렇게 FK와 WHERE 조건 컬럼에 인덱스를 구성하면 조인 시 빠른 탐색이 가능해집니다.

---

# 5. 다양한 인덱싱 기법

### B-Tree Index (기본값)

- 범위 검색 / 정렬에 유리
- 정확한 값 또는 prefix 검색 가능

```
-- 예시: 이름에 대한 B-Tree 인덱스 생성
CREATE INDEX idx_patient_name_btree ON patient(name);
```

---

### Hash Index

- PostgreSQL 10 이상에서 안정화됨
- 정확한 일치 검색 (=`=`)만 가능
- 성능은 B-Tree와 비슷하지만 제약 많음

```
-- 예시: 해시 인덱스 생성
CREATE INDEX idx_patient_name_hash ON patient USING hash(name);
```

---

### GIN Index (Generalized Inverted Index)

- 다중 키워드, 배열, JSON 검색 등에 사용
- `LIKE '%abc%'` 같은 Full Text Search에 적합

```
CREATE INDEX idx_patient_name_gin ON patient USING gin(to_tsvector('simple', name));
```

---

### Trigram Index (pg_trgm 확장)

- 유사 문자열 검색
- `LIKE '%abc%'`, 오타 방지 등에 유리

```
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_name_trgm ON patient USING gin (name gin_trgm_ops);
```

---

### N-gram Index

- 아시아권(한중일) 언어 처리에 적합
- PostgreSQL 기본 미지원 (외부 모듈 필요)

예를 들어 `pg_bigm` 확장을 활용하면 N-gram 기반의 GIN 인덱스를 생성할 수 있습니다.

```
-- pg_bigm 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- N-gram 기반 GIN 인덱스 생성 (pg_bigm)
CREATE INDEX idx_patient_name_bigram ON patient USING gin (name gin_bigm_ops);

-- 검색 예시
SELECT * FROM patient WHERE name LIKE '%치과%';

-- pg_trgm 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 사용자 정의 토크나이저 함수(f_ngram_tokenize)를 사용하는 경우의 GIN 인덱스 생성 예시 (pg_trgm 기반)
CREATE INDEX idx_users_name_ngram ON users USING GIN (f_ngram_tokenize(name) gin_trgm_ops);
CREATE INDEX idx_portfolios_name_ngram ON portfolios USING GIN (f_ngram_tokenize(name) gin_trgm_ops);
CREATE INDEX idx_projects_name_ngram ON projects USING GIN (f_ngram_tokenize(name) gin_trgm_ops);
CREATE INDEX idx_task_index_name_ngram ON task_index USING GIN (f_ngram_tokenize(name) gin_trgm_ops);

-- 검색 예시
SELECT * FROM users WHERE f_ngram_tokenize(name) LIKE '%검색어%';
```

---

```sql
※ `pg_trgm`은 오타 허용 및 유사도 기반 검색에 강점을 가지며, `pg_bigm`은 한글같이 띄어쓰기가 적은 언어에서 실용적입니다. 두 확장은 목적과 데이터 특성에 따라 선택적으로 병행 사용도 가능합니다.
```

※ N-gram은 단어 분리가 어려운 한글, 일본어, 중국어 등에서 매우 유용하게 쓰입니다.

| 항목        | pg_trgm                                  | pg_bigm                                              |
| ----------- | ---------------------------------------- | ---------------------------------------------------- |
| 특징        | 3-gram 기반 유사도 검색                  | 2-gram 기반 빠른 N-gram 검색                         |
| 강점        | 오타 허용, 유사도 기반                   | 한글, 일본어, 중국어 등 단어 경계가 모호한 언어 처리 |
| 확장 설치   | `CREATE EXTENSION pg_trgm;`              | `CREATE EXTENSION pg_bigm;`                          |
| 검색 함수   | 기본 LIKE /`%검색어%`                    | 기본 LIKE /`%검색어%`                                |
| 사용자 정의 | `f_ngram_tokenize()`등 커스터마이즈 가능 | 일반적으로 단순 GIN 적용                             |

### Reverse Index

- 접미어 검색 최적화용
- 문자열 뒤집어서 인덱싱 → `LIKE '%ple'`이 빠름

```
CREATE INDEX idx_name_reverse ON patient (reverse(name));
-- 검색 시 WHERE reverse(name) LIKE reverse('ple')
```

---

---

# 5. Unaccent 처리: 검색을 위한 전처리

글로벌 서비스에서 `café` vs `cafe`, `résumé` vs `resume` 같은 경우에 대비해야 함.

### PostgreSQL `unaccent` 확장

```
CREATE EXTENSION IF NOT EXISTS unaccent;
SELECT unaccent('café'); -- 결과: cafe
```

---

### 인덱스와 함께 사용하려면?

```
CREATE INDEX idx_unaccent_name ON patient (unaccent(name));
-- 검색 시: WHERE unaccent(name) ILIKE unaccent('cafe')
```

---

※ unaccent 사용 시에도 GIN + `pg_trgm` 조합 유용함

---

## 6. Collation 설정

Collation(정렬 규칙)은 문자열 비교 및 정렬 시 어떤 언어 규칙을 따를지를 정의합니다. 특히 대소문자 구분, 액센트 처리, 정렬 방식에 영향을 주며 다국어 환경에서 중요한 요소입니다.

### Collation의 역할

- **대소문자 구분 여부**
- **액센트 처리 여부** (`é` vs `e`)
- **알파벳/한글/중국어 등 정렬 순서 정의**

### PostgreSQL에서의 사용 예시

```
-- 기본 en_US 기준의 정렬
CREATE TABLE patient (
    name TEXT COLLATE "en_US"
);

-- ICU 기반 다국어 정렬 예시
CREATE TABLE employee (
    name TEXT COLLATE "und-x-icu"
);

-- 한국어 정렬
CREATE TABLE user_info (
    username TEXT COLLATE "ko_KR"
);
```

---

### 검색과의 관계

- `COLLATE "und-x-icu"`는 ICU(국제 컴포넌트 언어 라이브러리) 기반으로 여러 언어에 적합한 다국어 정렬과 비교를 제공합니다.
- 액센트 민감도를 줄이기 위해 `unaccent` 함수와 함께 사용하면 `résumé` vs `resume` 같은 검색이 가능해집니다.

```
-- unaccent와 collation을 함께 사용한 검색 예
SELECT * FROM patient
WHERE unaccent(name COLLATE "und-x-icu") ILIKE unaccent('resume');
```

---

- 로케일별 정렬 차이 예시:
  - `ko_KR`: 가나다라 순 정렬
  - `en_US`: 알파벳 순 정렬
  - `fr_FR`: 액센트 구분 여부에 따라 정렬 기준이 달라짐

### 주의 사항

- PostgreSQL 12 이상에서는 ICU 기반 Collation 지원이 강화되었습니다.
- ICU collation은 `libicu` 설치와 함께 initdb 시 생성된 데이터베이스에서만 사용할 수 있습니다.

적절한 Collation 설정은 다국어 사용자 환경에서 정확하고 기대한 대로의 정렬과 검색 결과를 보장합니다.

---

## 🔚 정리 및 추천 실전 전략

| 상황               | 추천 인덱스 및 처리             |
| ------------------ | ------------------------------- |
| 정확한 값 검색     | B-Tree                          |
| prefix 검색        | B-Tree                          |
| 중간 문자열        | GIN + Trigram (`pg_trgm`)       |
| 대소문자 구분 없음 | `citext` or lower() + index     |
| 액센트 없는 검색   | `unaccent()` + index            |
| 다국어 문자열      | `unaccent`, collation 설정 병행 |

---

## 참고 자료

- PostgreSQL 공식 문서: https://www.postgresql.org/docs/
- Full Text Search: https://www.postgresql.org/docs/current/textsearch.html
- pg_trgm: https://www.postgresql.org/docs/current/pgtrgm.html
- citext: https://www.postgresql.org/docs/current/citext.html
- ICU Collation: https://www.postgresql.org/docs/current/collation.html

---
