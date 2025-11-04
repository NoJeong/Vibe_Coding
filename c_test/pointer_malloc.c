#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main(void) {
    setlocale(LC_ALL, "ko_KR.UTF-8");

    int n = 5;
    int *arr = malloc(n * sizeof(int));
    if (!arr) {
        perror("메모리 할당 실패");
        return 1;
    }

    for (int i = 0; i < n; ++i) {
        arr[i] = (i + 1) * 10;
    }

    for (int i = 0; i < n; ++i) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    int first = arr[0];   // 해제하기 전에 값을 복사해 둔다.
    free(arr);

    printf("앞에서 복사한 값: %d\n", first);      // 안전
    printf("free 후 포인터 자체 주소: %p\n", (void*)arr);

    arr = NULL;                                      // NULL로 초기화
    printf("NULL로 초기화한 후 arr = %p\n", (void*)arr);

    return 0;
}
