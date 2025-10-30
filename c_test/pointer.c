#include <stdio.h>
#include <locale.h>

int main(void) {
    setlocale(LC_ALL, "ko_KR.UTF-8");    
    int value = 42;
    int *ptr = &value;   // value의 주소를 담는 포인터

    printf("value = %d\n", value);
    printf("&value = %p (주소)\n", (void*)&value);
    printf("ptr = %p (value의 주소)\n", (void*)ptr);
    printf("*ptr = %d (포인터로 접근한 값)\n", *ptr);

    *ptr = 100;          // 포인터를 통해 원래 변수 값 변경
    printf("value (after *ptr = 100) = %d\n", value);

    return 0;
}
